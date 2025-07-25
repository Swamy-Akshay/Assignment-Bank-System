# Bank System API

This is a backend system for a simple banking application, built as part of the Agetware hiring assessment. It allows creating loans, making payments, and viewing account details through a RESTful API.

---

### ## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite

---

### ## Core Features & API Endpoints

The system exposes the following functions:

#### 1. LEND: Create a new loan

- **Endpoint:** `POST /api/loans`
- **Description:** Calculates simple interest, total amount, and EMI, then creates a new loan record.
- **Request Body:**
  ```json
  {
    "customer_id": 1,
    "loan_amount": 50000,
    "loan_period": 2,
    "rate_of_interest": 0.08
  }
  ```

#### 2. PAYMENT: Make a lump sum payment

- **Endpoint:** `POST /api/loans/:loan_id/payments`
- **Description:** Records a payment and updates the total amount paid for the specified loan.
- **Request Body:**
  ```json
  {
    "amount": 5000
  }
  ```

#### 3. LEDGER: View loan history

- **Endpoint:** `GET /api/loans/:loan_id/ledger`
- **Description:** Returns all details for a single loan, including the balance, EMIs left, and a full transaction history.

#### 4. ACCOUNT OVERVIEW: View all loans for a customer

- **Endpoint:** `GET /api/customers/:customer_id/overview`
- **Description:** Returns a summary of all loans associated with a single customer.

---

### ## How to Run Locally

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node app.js
   ```
   The server will run at `http://localhost:3000`.
