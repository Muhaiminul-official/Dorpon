import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: Array, required: true },
  seller: { type: String, required: true },
  category: { type: String, required: true },
  offerPrice: { type: Number, required: true },
  date: { type: Number, required: true }
});
const product = mongoose.models.product || mongoose.model("product", productSchema);

export default product;