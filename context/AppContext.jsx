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
      let cartData = structuredClone(cartItems);
      if (cartData[itemId]) {
        cartData[itemId] += 1;
      } else {
        cartData[itemId] = 1;
      }
      setCartItems(cartData);

      if (user) {
        try {
          const token = await getToken()

          await axios.post('/api/cart/update', { cartData }, { headers: { Authorization: `Bearer${token}` } })
      toast.success('Item added, OK');
          
        } catch (error) {
          toast.error(error.message)
        }
      }



    };

    const updateCartQuantity = async (itemId, quantity) => {
      let cartData = structuredClone(cartItems);
      if (quantity === 0) {
        delete cartData[itemId];
      } else {
        cartData[itemId] = quantity;
      }
      setCartItems(cartData);
      if (user) {
        try {
          const token = await getToken();

          await axios.post(
            '/api/cart/update',
            { cartData },
            { headers: { Authorization: `Bearer${token}` } }
          );
          toast.success('Item Updated, OK');
        } catch (error) {
          toast.error(error.message);
        }
      }
    };


  const getCartCount = () => {
    return Object.values(cartItems || {}).reduce(
      (totalCount, count) => totalCount + count,
      0
    );
  };
 const getCartAmount = () => {
   let totalAmount = 0;
   for (const items in cartItems) {
     let itemInfo = products.find(product => product._id === items);
     if (cartItems[items] > 0) {
       totalAmount += itemInfo.offerPrice * cartItems[items];
     }
   }
   return Math.floor(totalAmount * 100) / 100;
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



