import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';
import connectDB from '@/config/db';
import Product from '@/models/Product';
import { getAuth } from '@clerk/nextjs/server';
import authSeller from '@/lib/authSeller';

// Validate environment variables
const requiredEnvVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const POST = async request => {
  try {
    // 1. Authentication check
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const isSeller = await authSeller(userId);
    if (!isSeller) {
      return NextResponse.json(
        { success: false, message: 'You are not authorized to add a product' },
        { status: 403 }
      );
    }

    // 2. Get and validate form data
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim();
    const description = formData.get('description')?.toString().trim();
    const price = formData.get('price')?.toString();
    const category = formData.get('category')?.toString().trim();
    const offerPrice = formData.get('offerPrice')?.toString();
    const files = formData.getAll('images');

    // Input validation
    if (!name || !description || !price || !category) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Please upload at least one image' },
        { status: 400 }
      );
    }

    // Validate price and offerPrice
    const parsedPrice = Number(price);
    const parsedOfferPrice = offerPrice ? Number(offerPrice) : null;
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid price value' },
        { status: 400 }
      );
    }
    if (
      parsedOfferPrice !== null &&
      (isNaN(parsedOfferPrice) || parsedOfferPrice < 0)
    ) {
      return NextResponse.json(
        { success: false, message: 'Invalid offer price value' },
        { status: 400 }
      );
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            message: 'Only JPEG, PNG, and GIF images are allowed',
          },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, message: 'File size must be less than 5MB' },
          { status: 400 }
        );
      }
    }

    // 3. Upload images to Cloudinary
    const uploadedImages = [];
    try {
      const uploadPromises = files.map(async file => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { resource_type: 'auto', timeout: 60000 },
              (error, result) => {
                if (error) {
                  reject(
                    new Error(`Cloudinary upload failed: ${error.message}`)
                  );
                } else {
                  resolve(result);
                }
              }
            )
            .end(buffer);
        });
      });

      const uploadResults = await Promise.all(uploadPromises);
      uploadedImages.push(
        ...uploadResults.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
        }))
      );
    } catch (uploadError) {
      throw new Error(`Failed to upload images: ${uploadError.message}`);
    }

    // 4. Create product in database
    let newProduct;
    try {
      await connectDB();
      newProduct = await Product.create({
        userId,
        name,
        description,
        category,
        price: parsedPrice,
        offerPrice: parsedOfferPrice,
        image: uploadedImages,
        date: Date.now(),
        seller: userId, // Add the seller field using userId
      });
    } catch (dbError) {
      // If database save fails, delete uploaded images from Cloudinary
      await Promise.all(
        uploadedImages.map(image =>
          cloudinary.uploader.destroy(image.public_id)
        )
      );
      throw new Error(`Database error: ${dbError.message}`);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Product uploaded successfully',
        data: newProduct,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Product creation error:', error);

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid product data',
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to create product',
      },
      { status: 500 }
    );
  }
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
