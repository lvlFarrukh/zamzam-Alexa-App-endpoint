import mongoose from 'mongoose';

const order = mongoose.Schema({
    customerName: String,
    customerEmail: String,
    orderId: String,
    items: [{
        dishName: String,
        quantity: Number,
    }],
    totalBill: {type: Number, default: 0},
    createdOn: { type: Date, default: Date.now },
})

const Order = mongoose.model("zamzamOder", order)

export default Order;