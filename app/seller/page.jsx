'use client';
import React, { useState, useEffect, useRef } from 'react';
import { assets } from '@/assets/assets';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';
import axios from 'axios';
import { toast } from 'react-toastify';

const AddProduct = () => {
  const { getToken } = useAppContext();

  const [files, setFiles] = useState([]); // Store file objects
  const [previews, setPreviews] = useState([]); // Store preview URLs
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Earphone');
  const [price, setPrice] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state
  const fileInputsRef = useRef([]); // Ref to reset file inputs

  // Cleanup preview URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const handleFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, and GIF images are allowed');
      return;
    }
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const updatedFiles = [...files];
    updatedFiles[index] = file;
    setFiles(updatedFiles.filter(Boolean));

    // Update preview URLs
    const updatedPreviews = [...previews];
    if (updatedPreviews[index]) {
      URL.revokeObjectURL(updatedPreviews[index]); // Clean up old preview
    }
    updatedPreviews[index] = URL.createObjectURL(file);
    setPreviews(updatedPreviews.filter(Boolean));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Validation
    if (!files.length) {
      toast.error('Please upload at least one image');
      return;
    }
    if (!name || !description || !price) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (Number(price) < 0 || (offerPrice && Number(offerPrice) < 0)) {
      toast.error('Prices cannot be negative');
      return;
    }

    setIsSubmitting(true); // Set loading state

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('offerPrice', offerPrice || '');
    files.forEach(file => formData.append('images', file));

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const { data } = await axios.post('/api/product/add', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data.success) {
        toast.success(data.message);
        // Reset form
        setFiles([]);
        setPreviews([]);
        setName('');
        setDescription('');
        setCategory('Earphone');
        setPrice('');
        setOfferPrice('');
        // Reset file inputs
        fileInputsRef.current.forEach(input => {
          if (input) input.value = '';
        });
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  return (
    <div className="flex-1 min-h-screen flex flex-col justify-between">
      <form onSubmit={handleSubmit} className="md:p-10 p-4 space-y-5 max-w-lg">
        <div>
          <p className="text-base font-medium">Product Images</p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[...Array(4)].map((_, index) => (
              <label key={index} htmlFor={`image${index}`} className="relative">
                <input
                  onChange={e => handleFileChange(e, index)}
                  type="file"
                  id={`image${index}`}
                  accept="image/jpeg,image/png,image/gif"
                  hidden
                  disabled={isSubmitting}
                  ref={el => (fileInputsRef.current[index] = el)} // Store ref to reset input
                />
                <Image
                  className="max-w-24 cursor-pointer object-cover"
                  src={previews[index] || assets.upload_area}
                  alt={`Upload slot ${index + 1}`}
                  width={100}
                  height={100}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label className="text-base font-medium" htmlFor="product-name">
            Product Name
          </label>
          <input
            id="product-name"
            type="text"
            placeholder="Type here"
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
            onChange={e => setName(e.target.value)}
            value={name}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col gap-1 max-w-md">
          <label
            className="text-base font-medium"
            htmlFor="product-description"
          >
            Product Description
          </label>
          <textarea
            id="product-description"
            rows={4}
            className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40 resize-none"
            placeholder="Type here"
            onChange={e => setDescription(e.target.value)}
            value={description}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={e => setCategory(e.target.value)}
              value={category}
              disabled={isSubmitting}
            >
              <option value="Earphone">Earphone</option>
              <option value="Headphone">Headphone</option>
              <option value="Watch">Watch</option>
              <option value="Smartphone">Smartphone</option>
              <option value="Laptop">Laptop</option>
              <option value="Camera">Camera</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="product-price">
              Product Price
            </label>
            <input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={e => setPrice(e.target.value)}
              value={price}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1 w-32">
            <label className="text-base font-medium" htmlFor="offer-price">
              Offer Price (Optional)
            </label>
            <input
              id="offer-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
              className="outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500/40"
              onChange={e => setOfferPrice(e.target.value)}
              value={offerPrice}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <button
          type="submit"
          className={`px-8 py-2.5 text-white font-medium rounded transition-colors ${
            isSubmitting
              ? 'bg-orange-400 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'ADD'}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
