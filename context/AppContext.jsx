'use client';
import { productsDummyData, userDummyData } from '@/assets/assets';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export const AppContext = createContext();

export const useAppContext = () => {
  return useContext(AppContext);
};

export const AppContextProvider = props => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY;
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [products, setProducts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [cartItems, setCartItems] = useState({});

  const fetchProductData = async () => {
    try {
      const { data } = await axios.get('/api/product/list');
      if (data?.success) {
        setProducts(data.data || []);
      } else {
        toast.error(data?.message || 'Failed to fetch products');
      }
    } catch (error) {
      toast.error(error?.message || 'An error occurred');
      setProducts(productsDummyData || []);
    }
  };

  const fetchUserData = async () => {
    try {
      if (user?.publicMetadata?.role === 'seller') {
        setIsSeller(true);
      }
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get('/api/user/data', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?.success) {
        setUserData(data.user || {});
        setCartItems(data.user?.cartItems || {});
      } else {
        toast.error(data?.message || 'Failed to fetch user data');
      }
    } catch (error) {
      toast.error(error?.message || 'An error occurred');
      setUserData(userDummyData || {});
    }
  };

  const addToCart = async itemId => {
    if (!itemId) return;
    setCartItems(prevCartItems => {
      const cartData = { ...prevCartItems };
      cartData[itemId] = (cartData[itemId] || 0) + 1;
      return cartData;
    });
    toast.success("Product added to cart");
    if (user) {
      try {
        const token = await getToken();
        await axios.post(
          '/api/cart/add',
          { productId: itemId },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success('Product added to cart');
      } catch (error) {
        toast.error(error?.message || 'Failed to add product to cart');
        console.error(error);
      }
    } else {
      toast.success('Product added to cart'); // For guest/local-only cart
    }

  };

  const updateCartQuantity = (itemId, quantity) => {
    if (!itemId || quantity < 0) return;
    setCartItems(prevCartItems => {
      const cartData = { ...prevCartItems };
      if (quantity === 0) {
        delete cartData[itemId];
      } else {
        cartData[itemId] = quantity;
      }
      return cartData;
    });
  };

  const getCartCount = () => {
    return Object.values(cartItems || {}).reduce(
      (totalCount, count) => totalCount + count,
      0
    );
  };

  const getCartAmount = () => {
    return Object.entries(cartItems || {})
      .reduce((totalAmount, [itemId, itemCount]) => {
        const itemInfo = products.find(product => product?._id === itemId);
        if (itemInfo && itemCount > 0) {
          totalAmount += (itemInfo?.offerPrice || 0) * itemCount;
        }
        return totalAmount;
      }, 0)
      .toFixed(2);
  };

  useEffect(() => {
    fetchProductData();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const value = {
    user,
    getToken,
    currency,
    router,
    isSeller,
    setIsSeller,
    userData,
    fetchUserData,
    products,
    fetchProductData,
    cartItems,
    setCartItems,
    addToCart,
    updateCartQuantity,
    getCartCount,
    getCartAmount,
  };

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

