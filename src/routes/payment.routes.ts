/// <reference path="../types/express.d.ts" />
import express from "express";
import axios from "axios";
import Transaction from "../models/Transaction.js";
import crypto from "crypto";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */

/**
 * @swagger
 * /payments/paystack/initiate:
 *   post:
 *     summary: Initialize a new payment with Paystack
 *     tags: [Payments]
 *     description: >
 *       Creates a new transaction record in the database and initializes a payment with Paystack.
 *       Returns a unique reference and an authorization URL for the client to redirect the user to.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to be paid (in the smallest currency unit, e.g., kobo for NGN). Must be at least 100.
 *                 example: 5000
 *     responses:
 *       201:
 *         description: Payment initialized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference:
 *                   type: string
 *                   description: The unique transaction reference.
 *                 authorization_url:
 *                   type: string
 *                   format: uri
 *                   description: The URL to redirect the user to for payment.
 *       400:
 *         description: Bad Request - Invalid amount or missing parameters.
 *       402:
 *         description: Payment Required - The payment initiation failed with the provider.
 */
router.post("/paystack/initiate", protect, async (req, res) => {
  const { amount } = req.body;

  // Type guard to ensure req.user is defined
  if (!req.user) {
    return res.status(401).json({ error: "Not authorized" });
  }
  const userId = req.user?.id;
  const email = req.user?.email; // Get email and ID from the authenticated user

  if (!amount || amount < 100) {
    return res.status(400).json({
      error: "Amount must be atleast 100.",
    });
  }
  if (!Number.isInteger(amount) || !amount)
    return res.status(400).json({
      error:
        "Invalid amount. Amount must be an integer representing the smallest currency unit (e.g., kobo).",
    });

  try {
    // 2. Check if the user already has a pending transaction
    const existingTransaction: string | any = await Transaction.findOne({
      where: { userId, status: "pending" },
    });

    if (existingTransaction) {
      return res.status(409).json({
        message:
          "You already have a pending transaction. Please complete or wait for it to expire.",
        authorization_url: existingTransaction.authorization_url,
        reference: existingTransaction.reference,
      });
    }

    // 3. Initialize transaction with Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount,
        email,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { reference, authorization_url } = response.data.data;

    // 2. Save transaction
    await Transaction.create({
      reference,
      amount,
      status: "pending",
      authorization_url, // Save the URL
      userId, // Link the transaction to the user
    });

    res.status(201).json({
      reference,
      authorization_url,
    });
  } catch (error: any) {
    console.log(error.response?.data || error);
    res.status(402).json({ error: "Payment initiation failed" });
  }
});

/**
 * @swagger
 * /payments/paystack/webhook:
 *   post:
 *     summary: Paystack webhook handler
 *     tags: [Payments]
 *     description: >
 *       Listens for events from Paystack, such as `charge.success`.
 *       It verifies the event's authenticity using the `x-paystack-signature` header.
 *       If the event is valid and the charge is successful, it updates the corresponding transaction status in the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             description: The webhook payload sent by Paystack.
 *             example:
 *               event: "charge.success"
 *               data: { reference: "T123456789", status: "success", amount: 5000, paid_at: "2023-10-27T10:30:00.000Z" }
 *     parameters:
 *       - in: header
 *         name: x-paystack-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: HMAC SHA512 signature of the request body to verify the event's authenticity.
 *     responses:
 *       200:
 *         description: Webhook received and processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad Request - Invalid signature.
 *       404:
 *         description: Not Found - The transaction reference from the webhook was not found in the database.
 *       500:
 *         description: Internal Server Error.
 */
router.post("/paystack/webhook", express.json(), async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  // The body needs to be stringified exactly as it was received.
  // Using express.json() might alter the spacing. For production, it's safer
  // to use a raw body parser for webhook endpoints to ensure the signature hash matches.
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature)
    return res.status(400).json({ error: "Invalid signature" });

  const event = req.body.event;
  const data = req.body.data;

  try {
    const tx = await Transaction.findOne({
      where: { reference: data.reference },
    });

    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    await tx.update({
      status: data.status,
      paid_at: data.paid_at,
    });

    res.json({ status: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /payments/paystack/{reference}/status:
 *   get:
 *     summary: Get payment status
 *     tags: [Payments]
 *     description: >
 *       Retrieves the status of a transaction from the local database.
 *       It also re-verifies the transaction with Paystack to get the latest status and updates the local record before returning the result.
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique transaction reference.
 *     responses:
 *       200:
 *         description: The current status and details of the transaction.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference:
 *                   type: string
 *                 status:
 *                   type: string
 *                   example: success
 *                 amount:
 *                   type: number
 *                 paid_at:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Not Found - The transaction reference does not exist.
 *       500:
 *         description: Internal Server Error - Failed to verify transaction with Paystack.
 */
router.get("/paystack/:reference/status", async (req, res) => {
  const { reference } = req.params;

  const tx: any = await Transaction.findOne({ where: { reference } });

  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  // Optional: refresh using Paystack verify
  try {
    const verify = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const info = verify.data.data;

    await tx.update({
      status: info.status,
      paid_at: info.paid_at,
    });

    res.json({
      reference: tx.reference,
      status: tx.status,
      amount: tx.amount,
      paid_at: tx.paid_at,
    });
  } catch (error: any) {
    console.error(error.response?.data || error);
    res.status(500).json({ error: "Failed to verify transaction" });
  }
});

export default router;
