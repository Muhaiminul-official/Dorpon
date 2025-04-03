import connectDB from "@/config/db";
import authSeller from "@/lib/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Product from "@/models/Product";


export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    const isSeller = await authSeller(userId);
    if (!isSeller) {
      return NextResponse.json(
        { success: false, message: 'You are not authorized to add a product' },
        { status: 403 }
      );
    }
    await connectDB();

    const products = await Product.find({ seller: userId });
    return NextResponse.json({ success: true, data: products });


   }
  catch (error) {
    return NextResponse.json({ success: false, message: error.message });

   }
}