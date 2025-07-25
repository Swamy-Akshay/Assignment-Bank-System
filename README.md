# Bank System API

This is a backend system for a simple banking application, built as part of the Agetware hiring assessment. It allows creating loans, making payments, and viewing account details through a RESTful API.

---

### ## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite

---

### ## API Endpoints

The system exposes the following functions:

#### 1. LEND: Create a new loan
- **Endpoint:** `POST /api/loans`
- **Description:** Creates a new loan and returns its details.
- **Request Body:**
  ```json
  {
    "customer_id": 1,
    "loan_amount": 50000,
    "loan_period": 2,
    "rate_of_interest": 0.08
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "loan_id": 1,
    "customer_id": 1,
    "total_amount_payable": 58000,
    "monthly_emi": 2417
  }
  ```

#### 2. PAYMENT: Make a lump sum payment
- **Endpoint:** `POST /api/loans/:loan_id/payments`
- **Description:** Records a payment and returns the updated loan status.
- **Request Body:**
  ```json
  {
    "amount": 5000
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "payment_id": 1,
    "loan_id": "1",
    "message": "Payment recorded successfully.",
    "remaining_balance": 53000,
    "emis_left": 22
  }
  ```

#### 3. LEDGER: View loan history
- **Endpoint:** `GET /api/loans/:loan_id/ledger`
- **Description:** Returns all details for a single loan, including a full transaction history.

#### 4. ACCOUNT OVERVIEW: View all loans for a customer
- **Endpoint:** `GET /api/customers/:customer_id/overview`
- **Description:** Returns a summary of all loans associated with a single customer.
- **Success Response (200 OK):**
  ```json
  {
      "customer_id": "1",
      "total_loans": 1,
      "loans": [
          {
              "loan_id": 1,
              "principal_amount": 50000,
              "total_amount_to_be_paid": 58000,
              "total_interest": 8000,
              "monthly_emi": 2417,
              "amount_paid_till_date": 5000,
              "emis_left": 22
          }
      ]
  }
  ```

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