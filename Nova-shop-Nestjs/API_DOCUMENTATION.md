# Products API Documentation

## Get All Products with Search and Pagination

### Endpoint

```
GET /products
```

### Query Parameters

- `search` (optional): Tìm kiếm theo tên sản phẩm
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số sản phẩm trên mỗi trang (mặc định: 10)

### Examples

#### 1. Lấy tất cả sản phẩm (trang 1, 10 sản phẩm)

```
GET /products
```

#### 2. Tìm kiếm sản phẩm theo tên

```
GET /products?search=iPhone
```

#### 3. Phân trang - trang 2, 5 sản phẩm mỗi trang

```
GET /products?page=2&limit=5
```

#### 4. Tìm kiếm + phân trang

```
GET /products?search=iPhone&page=1&limit=3
```

### Response Format

```json
{
  "products": [
    {
      "id": 1,
      "name": "iPhone 15",
      "description": "Latest iPhone model",
      "image": "https://...",
      "colors": "Black,Blue,Pink",
      "images": "url1,url2,url3",
      "storageOptions": "128GB,256GB,512GB",
      "price": 999,
      "discount": 50,
      "detailInformation": "{...}",
      "rate": 4.5,
      "reviewCount": 10,
      "reviews": [...]
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### Response Fields

- `products`: Mảng các sản phẩm
- `total`: Tổng số sản phẩm
- `page`: Trang hiện tại
- `limit`: Số sản phẩm trên mỗi trang
- `totalPages`: Tổng số trang
- `hasNextPage`: Có trang tiếp theo hay không
- `hasPrevPage`: Có trang trước hay không

### Authentication

API này yêu cầu JWT token. Thêm header:

```
Authorization: Bearer your-jwt-token
```

### Status Codes

- `200`: Thành công
- `401`: Chưa xác thực
- `400`: Tham số không hợp lệ
