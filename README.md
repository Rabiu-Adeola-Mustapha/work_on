```mermaid
sequenceDiagram
  participant U as User
  participant W as Web
  U->>W: Visit
  W->>U: Init
  Note over U, W: Create Session Id<br />Initialize Empty Cart
  U->>W: Add To Cart
  U->>W: Login
  Note over U, W: Associate Cart to User<br />Merge existing cart if necessary
  U->>W: Checkout
  Note over U, W: Create checkout record from cart items<br />User may not select all items from cart
  U->>W: Completed
  Note over U, W: Order Created<br />Remove items from cart
```
