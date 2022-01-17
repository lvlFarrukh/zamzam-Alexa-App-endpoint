import mongoose from 'mongoose';

const order = mongoose.Schema({
    userName: String,
    userEmail: String,
    orderId: String,
    items: [{
        dishName: String,
        quantity: Number,
    }],
    totalBill: Number,
    createdOn: { type: Date, default: Date.now },
})

const Order = mongoose.model("zamzamOder", order)

export default Order;