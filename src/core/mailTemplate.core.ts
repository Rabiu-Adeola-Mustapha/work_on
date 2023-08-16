import MailTemplateModel from "../models/mailTemplate.model";

async function createMailTemplates(shopId: string) {
  await Promise.all([
    MailTemplateModel.create({
      shopId,
      templateType: "orderCreatedUser",
      subject: "Your order has been created",
      body: orderCreatedUser,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "orderCreatedAdmin",
      subject: "An order has been created",
      body: orderCreatedAdmin,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "paymentReceivedAdmin",
      subject: "A payment for order has been confirmed",
      body: paymentReceivedUser,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "paymentReceivedUser",
      subject: "Your payment for order has been confirmed",
      body: paymentReceivedAdmin,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "orderShipped",
      subject: "Your order has been shipped",
      body: orderShipped,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "orderDelivered",
      subject: "Your order has been delivered",
      body: orderDelivered,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "orderCancelledAdmin",
      subject: "Your order has been cancelled",
      body: orderCanceled,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "orderCancelledUser",
      subject: "An order has been cancelled",
      body: orderCanceled,
    }),

    MailTemplateModel.create({
      shopId,
      templateType: "paymentRefunded",
      subject: "The payment for your order has been refunded",
      body: paymentRefunded,
    }),
  ]);
}

const orderDetails = `
   <!DOCTYPE html>
   <html lang="en">
   <head>
      <meta charset="UTF-8">
      <title>{{subject}}</title>
   </head>
   <body>
      INTRODUCTION
      <span>Please note:</span>
         You can track the status of your order through your personal account by
         <a href="{{shopRootUrl}}/order/{{orderId}}">clicking here</a>. You can also cancel your order by <a href="">clicking here</a>.
      </p>
      <table>
      <thead>
         <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Total</th>
         </tr>
      </thead>
      <tbody>
         {{#each orderItems}}
         <tr>
            <td>{{name}}</td>
            <td>{{price}}</td>
            <td>{{quantity}}</td>
            <td>{{total}}</td>
         </tr>
         {{/each}}
         <tr>
            <td></td>
            <td></td>
            <td><strong>Subtotal:</strong></td>
            <td>{{subtotal}}</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td><strong>Tax:</strong></td>
            <td>{{tax}}</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td><strong>Shipping:</strong></td>
            <td>{{shipping}}</td>
         </tr>
         <tr>
            <td></td>
            <td></td>
            <td><strong>Total:</strong></td>
            <td>{{total}}</td>
         </tr>
      </tbody>
      </table>
   </body>
   </html>
`;

const orderCreatedAdmin = orderDetails.replace(
  "INTRODUCTION",
  `<p>An Oder {{orderNumber}} has been created successfully. </p>`
);

const orderCreatedUser = orderDetails.replace(
  "INTRODUCTION",
  `<p>Your Oder {{orderNumber}} has been created successfully. </p>
   <p>
      It will be packed and shipped as soon as payment is confirmed. You can now proceed to complete the payment for
      your order. You will receive a notification from us once the payment is confirmed
   </p>`
);

const paymentReceivedAdmin = orderDetails.replace(
  "INTRODUCTION",
  `<p>
      A payment has been confirmed for order
      <span style="font-weight:bolder;font-size:20px;color:blue">id: {{orderNumber}}</span>
   </p>`
);

const paymentReceivedUser = orderDetails.replace(
  "INTRODUCTION",
  `<p>
      Thank you for shopping with us! Your payment has been received 
      and your order is currently being processed. Here are the details of your order:
      <span style="font-weight:bolder;font-size:20px;color:blue">id: {{orderNumber}}</span>
   </p>
   <p>Please note that your order may take a few days to process and ship. We will 
      send you another email with tracking information once your order has been shipped.</p>
   <p>If you have any questions or concerns, please do not hesitate to contact us at {{supportEmail}}.</p>
   <p>Thank you for your business!</p>`
);

const orderShipped = orderDetails.replace(
  "INTRODUCTION",
  `<p>We are pleased to inform you that your order has been shipped and is on its way to you. Please find the shipping details below:</p>`
);

const orderDelivered = orderDetails.replace(
  "INTRODUCTION",
  `<p>We are pleased to inform you that your order has been delivered. 
   Please find the order details below:</p>`
);

const orderCanceled = orderDetails.replace(
  "INTRODUCTION",
  `<p>We regret to inform you that your order has been canceled.
    Please find the order details below:</p>`
);

const paymentRefunded = orderDetails.replace(
  "INTRODUCTION",
  `<p>Your payment for order 
      <span style="font-weight:bolder;font-size:20px;color:blue">id: {{orderNumber}}</span>
      has been refunded. Please find the order details below:
   </p>`
);

export default {
  createMailTemplates,
};
