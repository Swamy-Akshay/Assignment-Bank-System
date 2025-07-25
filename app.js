// --- Boilerplate and Setup ---
const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
app.use(express.json()); // Lets our app read JSON from request bodies

const dbPath = path.join(__dirname, "bank.db");
let db = null;

// Connect to the DB and create tables if they don't already exist
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    // Using quotes around table names just in case of SQL keyword conflicts
    await db.exec(`
            CREATE TABLE IF NOT EXISTS "Customer" (
                customer_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT
            );
            CREATE TABLE IF NOT EXISTS "Loan" (
                loan_id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, principal_amount REAL,
                interest_rate REAL, loan_period_years INTEGER, total_amount_due REAL,
                monthly_emi REAL, amount_paid REAL DEFAULT 0,
                FOREIGN KEY (customer_id) REFERENCES "Customer"(customer_id)
            );
            CREATE TABLE IF NOT EXISTS "Transaction" (
                transaction_id INTEGER PRIMARY KEY AUTOINCREMENT, loan_id INTEGER, amount REAL,
                payment_date TEXT, payment_type TEXT,
                FOREIGN KEY (loan_id) REFERENCES "Loan"(loan_id)
            );
        `);

    // Good to go, boot up the server
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

// --- API Endpoints ---

// 1. LEND: Create a new loan
app.post("/api/loans", async (request, response) => {
  // Grab input from the request
  const { customer_id, loan_amount, loan_period, rate_of_interest } =
    request.body;

  // Validate that all required fields are present
  if (!customer_id || !loan_amount || !loan_period || !rate_of_interest) {
    return response.status(400).send({ error: "Missing required fields" });
  }

  // Simple interest calculation
  const interest = loan_amount * loan_period * rate_of_interest;
  const totalAmount = loan_amount + interest;
  const monthlyEMI = Math.ceil(totalAmount / (loan_period * 12));

  // Save the new loan to the DB
  const addLoanQuery = `
        INSERT INTO "Loan" (customer_id, principal_amount, interest_rate, loan_period_years, total_amount_due, monthly_emi)
        VALUES (?, ?, ?, ?, ?, ?);
    `;
  // Get the result of the query, which contains the ID of the new row
  const result = await db.run(addLoanQuery, [
    customer_id,
    loan_amount,
    rate_of_interest,
    loan_period,
    totalAmount,
    monthlyEMI,
  ]);

  // Send back the response including the new loan_id
  response.status(201).send({
    loan_id: result.lastID,
    customer_id: customer_id,
    total_amount_payable: totalAmount,
    monthly_emi: monthlyEMI,
  });
});

// 2. PAYMENT: Make a payment on a loan
app.post("/api/loans/:loan_id/payments", async (request, response) => {
  const { loan_id } = request.params;
  const { amount } = request.body;

  // First, record this payment in the transaction history
  const transactionQuery = `INSERT INTO "Transaction" (loan_id, amount, payment_date, payment_type) VALUES (?, ?, ?, ?);`;
  const transactionResult = await db.run(transactionQuery, [
    loan_id,
    amount,
    new Date().toISOString(),
    "LUMP_SUM",
  ]);

  // Then, update the total amount paid on the loan itself
  const updateLoanQuery = `UPDATE "Loan" SET amount_paid = amount_paid + ? WHERE loan_id = ?;`;
  await db.run(updateLoanQuery, [amount, loan_id]);

  // Now, get the updated loan details to calculate the new balance
  const getLoanQuery = `SELECT * FROM "Loan" WHERE loan_id = ?;`;
  const updatedLoan = await db.get(getLoanQuery, [loan_id]);

  // Calculate the remaining balance and EMIs
  const remainingBalance =
    updatedLoan.total_amount_due - updatedLoan.amount_paid;
  const emisLeft = Math.ceil(remainingBalance / updatedLoan.monthly_emi);

  // Send back the detailed response as per the spec
  response.send({
    payment_id: transactionResult.lastID,
    loan_id: loan_id,
    message: "Payment recorded successfully.",
    remaining_balance: remainingBalance,
    emis_left: emisLeft,
  });
});

// 3. LEDGER: Get the full history and status of one loan
app.get("/api/loans/:loan_id/ledger", async (request, response) => {
  const { loan_id } = request.params;

  // Get the loan from the DB
  const getLoanQuery = `SELECT * FROM "Loan" WHERE loan_id = ?;`;
  const loan = await db.get(getLoanQuery, [loan_id]);

  // Handle case where loan doesn't exist
  if (!loan) {
    return response.status(404).send({ error: "Loan not found" });
  }

  // Now grab all its payment transactions
  const getTransactionsQuery = `SELECT * FROM "Transaction" WHERE loan_id = ?;`;
  const transactions = await db.all(getTransactionsQuery, [loan_id]);

  // Do the math for the current balance and EMIs left
  const balanceAmount = loan.total_amount_due - loan.amount_paid;
  const emisLeft = Math.ceil(balanceAmount / loan.monthly_emi);

  // Send everything back in one package
  response.send({
    loan_details: loan,
    balance_amount: balanceAmount,
    emis_left: emisLeft,
    transactions,
  });
});

// 4. ACCOUNT OVERVIEW: Get all loans for one customer
app.get("/api/customers/:customer_id/overview", async (request, response) => {
  const { customer_id } = request.params;

  // Find all loans belonging to this customer
  const getCustomerLoansQuery = `SELECT * FROM "Loan" WHERE customer_id = ?;`;
  const customerLoans = await db.all(getCustomerLoansQuery, [customer_id]);

  // This part is important. If there are no loans, we don't error.
  // We return the structure with an empty list, as the customer exists.
  if (!customerLoans.length) {
    return response.send({
      customer_id: customer_id,
      total_loans: 0,
      loans: [],
    });
  }

  // Loop through the loans and format the output for each one
  const loansList = customerLoans.map((loan) => {
    const balance = loan.total_amount_due - loan.amount_paid;
    return {
      loan_id: loan.loan_id,
      principal_amount: loan.principal_amount,
      total_amount_to_be_paid: loan.total_amount_due,
      total_interest: loan.total_amount_due - loan.principal_amount,
      monthly_emi: loan.monthly_emi,
      amount_paid_till_date: loan.amount_paid,
      emis_left: Math.ceil(balance / loan.monthly_emi),
    };
  });

  // Send the final object, formatted to match the spec
  response.send({
    customer_id: customer_id,
    total_loans: loansList.length,
    loans: loansList,
  });
});

// --- Start the app ---
initializeDBAndServer();
