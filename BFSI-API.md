# BFSI Core Service API

**Base URL (qua Kong Gateway):** `http://localhost:8000`
**Service trực tiếp:** `http://localhost:3008`
**Prefix:** `/api/v1/bfsi`

---

## Tổng quan

BFSI Core Service (MS-8) cung cấp API truy vấn thông tin sản phẩm ngân hàng theo CIF (Customer Information File). Service hiện tại dùng **Mock Core Banking Adapter** tích hợp Circuit Breaker — dữ liệu thực tế theo từng CIF seeded.

### Circuit Breaker
- **Threshold:** 5 lỗi liên tiếp → mở circuit
- **Reset timeout:** 30 giây
- **Fallback:** trả dữ liệu cached từ `bfsi_db` nếu CBS unavailable

### Dữ liệu test (seeded CIFs)

| CIF | Khách hàng | Sản phẩm |
|-----|-----------|----------|
| `CIF001001` | Nguyễn Văn An | Tài khoản + Tiết kiệm 12T + Vay tiêu dùng + Visa Platinum |
| `CIF001002` | Trần Thị Bích | Tài khoản + Tiết kiệm không kỳ hạn + Mastercard Gold |
| `CIF001003` | Lê Văn Cường | Tài khoản + Vay mua xe (quá hạn) |
| `CIF001004` | Phạm Thị Dung | Tài khoản + Tiết kiệm 6T + Visa Signature |
| `CIF001005` | Hoàng Văn Em | Tài khoản + Vay mua nhà 20 năm |

### Masking số tài khoản
Tất cả `accountNumber` trong response đã được mask — chỉ hiển thị 4 ký tự cuối. Ví dụ: `"0021234567890"` → `"*********7890"`.

---

## Endpoints

### 1. Lấy tất cả sản phẩm theo CIF

```
GET /api/v1/bfsi/customers/:cif/products
```

**Query params:**

| Param | Type | Required | Mô tả |
|-------|------|----------|-------|
| `type` | string | No | Lọc theo loại: `account`, `savings`, `loan`, `card` |

**Ví dụ:**
```bash
# Tất cả sản phẩm
curl http://localhost:8000/api/v1/bfsi/customers/CIF001001/products

# Chỉ khoản vay
curl http://localhost:8000/api/v1/bfsi/customers/CIF001001/products?type=loan
```

**Response 200 — array các sản phẩm (type tùy theo filter):**
```json
[
  {
    "type": "account",
    "accountNumber": "*********7890",
    "productName": "Tài khoản thanh toán VND",
    "accountType": "Current Account",
    "balance": 125500000,
    "availableBalance": 125500000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2020-01-15T00:00:00.000Z",
    "branch": "Chi nhánh Hà Nội"
  },
  {
    "type": "loan",
    "accountNumber": "********1234",
    "productName": "Vay tiêu dùng cá nhân",
    "loanAmount": 300000000,
    "currentBalance": 250000000,
    "balance": -250000000,
    "interestRate": 12.5,
    "term": 36,
    "monthlyPayment": 8500000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2024-01-15T00:00:00.000Z",
    "maturityDate": "2027-01-15T00:00:00.000Z",
    "nextPaymentDate": "2025-04-15T00:00:00.000Z"
  }
]
```

---

### 2. Tài khoản thanh toán

```
GET /api/v1/bfsi/customers/:cif/accounts
```

**Response 200:**
```json
[
  {
    "type": "account",
    "accountNumber": "*********7890",
    "productName": "Tài khoản thanh toán VND",
    "accountType": "Current Account",
    "balance": 125500000,
    "availableBalance": 125500000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2020-01-15T00:00:00.000Z",
    "branch": "Chi nhánh Hà Nội"
  }
]
```

**Các trường:**

| Trường | Type | Mô tả |
|--------|------|-------|
| `type` | `"account"` | Loại sản phẩm |
| `accountNumber` | string | Số tài khoản (masked, 4 ký tự cuối) |
| `productName` | string | Tên sản phẩm |
| `accountType` | string | Loại tài khoản: `Current Account`, `Savings Account` |
| `balance` | number | Số dư hiện tại (VND) |
| `availableBalance` | number | Số dư khả dụng (VND) |
| `status` | string | `active` \| `inactive` \| `frozen` |
| `currency` | string | Đơn vị tiền tệ, mặc định `VND` |
| `openedAt` | ISO datetime | Ngày mở tài khoản |
| `branch` | string | Chi nhánh mở tài khoản |

---

### 3. Sản phẩm tiết kiệm

```
GET /api/v1/bfsi/customers/:cif/savings
```

**Response 200:**
```json
[
  {
    "type": "savings",
    "accountNumber": "*******-001",
    "productName": "Tiết kiệm có kỳ hạn 12 tháng",
    "term": "12 tháng",
    "interestRate": 6.5,
    "principal": 200000000,
    "balance": 200000000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2024-03-15T00:00:00.000Z",
    "maturityDate": "2025-03-15T00:00:00.000Z",
    "autoRenewal": true
  }
]
```

**Các trường:**

| Trường | Type | Mô tả |
|--------|------|-------|
| `type` | `"savings"` | Loại sản phẩm |
| `accountNumber` | string | Số sổ tiết kiệm (masked) |
| `productName` | string | Tên sản phẩm tiết kiệm |
| `term` | string | Kỳ hạn: `"12 tháng"`, `"6 tháng"`, `"Không kỳ hạn"` |
| `interestRate` | number | Lãi suất (%/năm) |
| `principal` | number | Số tiền gốc (VND) |
| `balance` | number | Số dư hiện tại (VND) |
| `status` | string | `active` \| `matured` \| `closed` |
| `currency` | string | Đơn vị tiền tệ |
| `openedAt` | ISO datetime | Ngày gửi |
| `maturityDate` | ISO datetime \| null | Ngày đáo hạn (null nếu không kỳ hạn) |
| `autoRenewal` | boolean | Tự động tái tục khi đến hạn |

**Lưu ý:** Trả về `[]` nếu CIF không có sản phẩm tiết kiệm.

---

### 4. Khoản vay

```
GET /api/v1/bfsi/customers/:cif/loans
```

**Response 200 — khoản vay bình thường:**
```json
[
  {
    "type": "loan",
    "accountNumber": "********1234",
    "productName": "Vay tiêu dùng cá nhân",
    "loanAmount": 300000000,
    "currentBalance": 250000000,
    "balance": -250000000,
    "interestRate": 12.5,
    "term": 36,
    "monthlyPayment": 8500000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2024-01-15T00:00:00.000Z",
    "maturityDate": "2027-01-15T00:00:00.000Z",
    "nextPaymentDate": "2025-04-15T00:00:00.000Z"
  }
]
```

**Response 200 — khoản vay quá hạn (status: `overdue`):**
```json
[
  {
    "type": "loan",
    "accountNumber": "********5678",
    "productName": "Vay mua xe",
    "loanAmount": 280000000,
    "currentBalance": 180000000,
    "balance": -180000000,
    "interestRate": 9.8,
    "term": 48,
    "monthlyPayment": 6200000,
    "status": "overdue",
    "currency": "VND",
    "openedAt": "2023-06-20T00:00:00.000Z",
    "maturityDate": "2027-06-20T00:00:00.000Z",
    "nextPaymentDate": "2025-03-05T00:00:00.000Z",
    "overdueAmount": 6200000,
    "overdueDays": 10
  }
]
```

**Các trường:**

| Trường | Type | Mô tả |
|--------|------|-------|
| `type` | `"loan"` | Loại sản phẩm |
| `accountNumber` | string | Số hợp đồng vay (masked) |
| `productName` | string | Tên khoản vay |
| `loanAmount` | number | Số tiền vay ban đầu (VND) |
| `currentBalance` | number | Dư nợ hiện tại (VND, dương) |
| `balance` | number | Dư nợ (âm vì là nợ) |
| `interestRate` | number | Lãi suất (%/năm) |
| `term` | number | Kỳ hạn vay (tháng) |
| `monthlyPayment` | number | Số tiền trả hàng tháng (VND) |
| `status` | string | `active` \| `overdue` \| `closed` \| `settled` |
| `currency` | string | Đơn vị tiền tệ |
| `openedAt` | ISO datetime | Ngày giải ngân |
| `maturityDate` | ISO datetime | Ngày đáo hạn |
| `nextPaymentDate` | ISO datetime | Ngày đến hạn trả tiếp theo |
| `overdueAmount` | number | *(chỉ khi `overdue`)* Số tiền quá hạn (VND) |
| `overdueDays` | number | *(chỉ khi `overdue`)* Số ngày quá hạn |

---

### 5. Thẻ ngân hàng

```
GET /api/v1/bfsi/customers/:cif/cards
```

**Response 200:**
```json
[
  {
    "type": "card",
    "accountNumber": "************1234",
    "productName": "Visa Platinum",
    "cardType": "Credit Card",
    "creditLimit": 50000000,
    "availableBalance": 35000000,
    "balance": -15000000,
    "status": "active",
    "currency": "VND",
    "openedAt": "2023-03-15T00:00:00.000Z",
    "maturityDate": "2028-03-31T00:00:00.000Z",
    "cardholderName": "NGUYEN VAN AN"
  }
]
```

**Các trường:**

| Trường | Type | Mô tả |
|--------|------|-------|
| `type` | `"card"` | Loại sản phẩm |
| `accountNumber` | string | Số thẻ (masked, 4 ký tự cuối) |
| `productName` | string | Tên sản phẩm thẻ |
| `cardType` | string | `Credit Card` \| `Debit Card` |
| `creditLimit` | number | Hạn mức tín dụng (VND, chỉ Credit Card) |
| `availableBalance` | number | Hạn mức khả dụng (VND) |
| `balance` | number | Dư nợ thẻ tín dụng (âm) |
| `status` | string | `active` \| `blocked` \| `expired` |
| `currency` | string | Đơn vị tiền tệ |
| `openedAt` | ISO datetime | Ngày phát hành thẻ |
| `maturityDate` | ISO datetime | Ngày hết hạn thẻ |
| `cardholderName` | string | Tên chủ thẻ (in hoa) |

---

### 6. Lịch sử giao dịch

```
GET /api/v1/bfsi/customers/:cif/transactions
```

**Query params:**

| Param | Type | Required | Default | Mô tả |
|-------|------|----------|---------|-------|
| `limit` | integer | No | `20` | Số giao dịch trả về (1–100) |

**Ví dụ:**
```bash
curl http://localhost:8000/api/v1/bfsi/customers/CIF001001/transactions
curl http://localhost:8000/api/v1/bfsi/customers/CIF001001/transactions?limit=5
```

**Response 200:**
```json
[
  {
    "id": "CIF001001-TXN-0001",
    "amount": 5000000,
    "type": "credit",
    "description": "Nhận lương tháng 3/2026",
    "accountNumber": "0021234567890",
    "currency": "VND",
    "balance": null,
    "timestamp": "2026-03-15T12:24:31.437Z"
  },
  {
    "id": "CIF001001-TXN-0002",
    "amount": 1200000,
    "type": "debit",
    "description": "Thanh toán điện nước",
    "accountNumber": "0021234567890",
    "currency": "VND",
    "balance": null,
    "timestamp": "2026-03-13T12:24:31.437Z"
  }
]
```

**Các trường:**

| Trường | Type | Mô tả |
|--------|------|-------|
| `id` | string | ID giao dịch định dạng `{CIF}-TXN-{NNNN}` |
| `amount` | number | Số tiền giao dịch (VND, dương) |
| `type` | string | `credit` (tiền vào) \| `debit` (tiền ra) |
| `description` | string | Mô tả giao dịch |
| `accountNumber` | string | Số tài khoản giao dịch (không masked trong transactions) |
| `currency` | string | Đơn vị tiền tệ |
| `balance` | number \| null | Số dư sau giao dịch (hiện tại `null` — CBS chưa trả về) |
| `timestamp` | ISO datetime | Thời gian giao dịch |

**Lỗi validation:**
```json
// limit > 100
{
  "message": ["limit must not be greater than 100"],
  "error": "Bad Request",
  "statusCode": 400
}

// limit không phải số nguyên
{
  "message": [
    "limit must not be greater than 100",
    "limit must not be less than 1",
    "limit must be an integer number"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 7. Circuit Breaker Health

```
GET /api/v1/bfsi/health/circuit-breaker
```

**Response 200:**
```json
{
  "state": "CLOSED"
}
```

**Các trạng thái:**

| State | Mô tả |
|-------|-------|
| `CLOSED` | Bình thường — tất cả request đi đến CBS |
| `OPEN` | CBS đang lỗi — tất cả request bị chặn, fallback về cache |
| `HALF_OPEN` | Đang thử lại sau thời gian reset |

---

## Behavior đặc biệt

### CIF không tồn tại
Trả về dữ liệu mặc định (1 tài khoản generic), không trả 404:
```json
// GET /api/v1/bfsi/customers/UNKNOWN999/accounts
[
  {
    "type": "account",
    "accountNumber": "*********1111",
    "productName": "Tài khoản thanh toán VND",
    "balance": 10000000,
    "status": "active",
    "currency": "VND"
  }
]
```

### Sản phẩm không có
Trả về mảng rỗng `[]` — không trả 404:
```json
// GET /api/v1/bfsi/customers/CIF001003/savings
[]
```

### Fallback khi CBS lỗi
Khi Circuit Breaker ở trạng thái `OPEN`, service trả về dữ liệu cached từ DB:
```json
{
  "products": [...],
  "stale": true,
  "message": "Returning cached data - Core Banking System unavailable"
}
```

---

## Dữ liệu chi tiết các CIF seeded

### CIF001001 — Nguyễn Văn An

**Tài khoản:** `*********7890` | Số dư: 125,500,000 VND | Chi nhánh Hà Nội
**Tiết kiệm:** `*******-001` | 12 tháng | 6.5%/năm | Gốc: 200,000,000 VND | Đáo hạn 15/03/2025
**Vay:** `********1234` | Tiêu dùng | 12.5%/năm | Dư nợ: 250,000,000 VND | Trả 8,500,000/tháng
**Thẻ:** `************1234` | Visa Platinum | Hạn mức: 50,000,000 VND | Khả dụng: 35,000,000 VND

---

### CIF001002 — Trần Thị Bích

**Tài khoản:** `*********3210` | Số dư: 45,200,000 VND | Chi nhánh TP.HCM
**Tiết kiệm:** `*******-045` | Không kỳ hạn | 2.0%/năm | Gốc: 50,000,000 VND
**Thẻ:** `************5678` | Mastercard Gold | Hạn mức: 30,000,000 VND | Khả dụng: 28,000,000 VND

---

### CIF001003 — Lê Văn Cường ⚠️ Vay quá hạn

**Tài khoản:** `*********4567` | Số dư: 8,750,000 VND | Chi nhánh Đà Nẵng
**Vay:** `********5678` | Vay mua xe | **status: overdue** | Quá hạn: 6,200,000 VND (10 ngày)

---

### CIF001004 — Phạm Thị Dung

**Tài khoản:** `*********0123` | Số dư: 320,000,000 VND | Chi nhánh Hà Nội
**Tiết kiệm:** `*******-088` | 6 tháng | 5.8%/năm | Gốc: 500,000,000 VND | Đáo hạn 22/06/2026
**Thẻ:** `************1881` | Visa Signature | Hạn mức: 100,000,000 VND | Khả dụng: 82,000,000 VND

---

### CIF001005 — Hoàng Văn Em

**Tài khoản:** `*********2345` | Số dư: 15,300,000 VND | Chi nhánh Hải Phòng
**Vay:** `********9012` | Vay mua nhà 20 năm | 8.5%/năm | Dư nợ: 1,450,000,000 VND | Trả 13,200,000/tháng

---

## Kong Gateway

| Route | Service | Strip Path |
|-------|---------|-----------|
| `/api/v1/bfsi` | `bfsi-core-service` (port 3008) | `false` |

**Lưu ý:** Kong giữ nguyên path khi forward (`strip_path: false`). Service có `globalPrefix: api/v1` + controller `bfsi` → routes đầy đủ là `/api/v1/bfsi/...`.
