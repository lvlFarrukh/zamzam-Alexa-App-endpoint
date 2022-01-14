import mongoose from 'mongoose';

const order = mongoose.Schema({
    userName: String,
    userEmail: String,
    dish: String,
    quantity: Number,
    createdOn: { type: Date, default: Date.now },
})

const Order = mongoose.model("zamzamOder", order)

export default Order;