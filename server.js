const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors({
  origin: "https://airtime-to-cash-frontend.vercel.app",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/airtime_to_cash";

mongoose
  .connect(MONGO_URI,)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(" MongoDB Connection Failed:", err));

const transactionSchema = new mongoose.Schema({
  phone: String,
  network: String,
  amount: Number,
  recipientNumber: String,
  cashValue: Number,
  status: { type: String, default: "pending" },
  bankName: String,
  accountNumber: String,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

app.post("/api/initiate-transaction", async (req, res) => {
  const { phone, network, amount, recipientNumber, cashValue } = req.body;

  if (!phone ||!network||!amount || !recipientNumber || !cashValue) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const newTransaction = new Transaction({ phone, network, amount, recipientNumber, cashValue, status: "pending" });
    await newTransaction.save();
    
    // console.log("Transaction initiated:", newTransaction);
    res.json({ message: "Transaction initiated successfully!", transaction: newTransaction });
  } catch (error) {
    console.error(" Error initiating transaction:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/api/confirm-airtime", async (req, res) => {
  const { phone } = req.body;

  console.log(" Confirming airtime for", phone);

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required!" });
  }

  try {
    const transaction = await Transaction.findOne({ phone, status: "pending" });

    if (!transaction) {
      console.log("No pending transaction found for phone:", phone);
      return res.status(400).json({ message: "No matching transaction found!" });
    }

    transaction.status = "airtime_sent";
    await transaction.save();

    console.log("Airtime confirmed for:", phone);
    res.json({ message: "Airtime received. Proceed to enter bank details." });
  } catch (error) {
    console.error("🔥 Error confirming airtime:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/api/transaction-status/:phone", async (req, res) => {
  const { phone } = req.params;

  console.log(" Checking transaction for phone:", phone);

  try {
    const transaction = await Transaction.findOne({ phone, status: "airtime_sent" });

    if (!transaction) {
      console.log("No transaction found for phone:", phone);
      return res.status(404).json({ message: "No transaction found." });
    }

    console.log(" Transaction found:", transaction);
    res.json(transaction);
  } catch (error) {
    console.error(" Error fetching transaction:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.post("/api/enter-bank-details", async (req, res) => {
  const { phone, bankName, accountNumber } = req.body;

  console.log("Received phone number:", phone);
  console.log("Bank Name:", bankName);
  console.log(" Account Number:", accountNumber);

  if (!phone || !bankName || !accountNumber) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    const transaction = await Transaction.findOne({ phone, status: "airtime_sent" });

    if (!transaction) {
      console.log(" No transaction found for phone:", phone);
      return res.status(400).json({ message: "No matching transaction found!" });
    }

    transaction.status = "processing_payment";
    transaction.bankName = bankName;
    transaction.accountNumber = accountNumber;
    await transaction.save();

    console.log(" Transaction updated successfully!");
    res.json({ message: "Payment is being processed. You will receive it shortly." });

  } catch (error) {
    console.error("Error processing bank details:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/api/final-status/:phone", async (req, res) => {
  const { phone } = req.params;

  console.log(" Checking final status for:", phone);

  try {
    const transaction = await Transaction.findOne({ phone });

    if (!transaction) {
      return res.status(404).json({ message: "No transaction found." });
    }

    console.log(" Final transaction status:", transaction.status);
    res.json({ status: transaction.status });
  } catch (error) {
    console.error("Error checking final status:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

// Start the server
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
