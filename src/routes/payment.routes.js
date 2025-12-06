import express from "express";
import axios from "axios";
import Transaction from "../models/Transaction.js";
import crypto from "crypto";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing endpoints
 */
router.post("/paystack/initiate", async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount < 100)
    return res.status(400).json({ error: "Invalid amount" });

  try {
    // 1. Initialize transaction with Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        amount,
        email: "test@example.com", // can be user's email
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
    });

    res.status(201).json({
      reference,
      authorization_url,
    });
  } catch (error) {
    console.log(error.response?.data || error);
    res.status(402).json({ error: "Payment initiation failed" });
  }
});
/**
 * @swagger
 * /payments/initialize:
 *   post:
 *     summary: Initialize a new payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - amount
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email of the user making the payment.
 *               amount:
 *                 type: number
 *                 description: The amount to be paid (in the smallest currency unit, e.g., kobo).
 *     responses:
 *       200:
 *         description: Payment initialized successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorization_url:
 *                   type: string
 *                   description: The URL to redirect the user to for payment.
 */

router.post("/paystack/webhook", express.json(), async (req, res) => {
  const signature = req.headers["x-paystack-signature"];

  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
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

router.get("/payments/:reference/status", async (req, res) => {
  const { reference } = req.params;

  const tx = await Transaction.findOne({ where: { reference } });

  if (!tx) return res.status(404).json({ error: "Transaction not found" });

  // Optional: refresh using Paystack verify
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
});

export default router;
