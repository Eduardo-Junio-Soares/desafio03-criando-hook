import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const isAllreadyExist = cart.find((item) => item.id === productId);

      if (!isAllreadyExist) {
        api
          .get(`/products/${productId}`)
          .then((res) => {
            const response = res.data;

            response.amount = 1;

            setCart([...cart, response]);
            localStorage.setItem(
              "@RocketShoes:cart",
              JSON.stringify([...cart, response])
            );
          })
          .catch(() => toast.error("Erro na adição do produto"));
      } else {
        api.get(`/stock/${productId}`).then((res) => {
          const response: Stock = res.data;

          if (isAllreadyExist?.amount >= response.amount) {
            toast.error("Quantidade solicitada fora de estoque");
            return;
          }
          const setAmountProduct = cart.map((item) =>
            item.id === productId
              ? { ...item, amount: (item.amount += 1) }
              : item
          );

          setCart(setAmountProduct);
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(setAmountProduct)
          );
        });
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const isExistInCart = cart.find((item) => item.id === productId);
      console.log(
        "🚀 ~ file: useCart.tsx ~ line 89 ~ removeProduct ~ isExistInCart",
        isExistInCart
      );
      if (!isExistInCart) {
        return toast.error("Erro na remoção do produto");
      }
      const productRemoved = cart.filter((item) => item.id !== productId);

      setCart(productRemoved);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(productRemoved));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return;
    }

    try {
      await api.get(`/stock/${productId}`).then((res) => {
        const response = res.data;
        const updateCart = cart.map((item) =>
          item.id === productId ? { ...item, amount } : item
        );

        const productToUpdate = updateCart.find((item) => item.id === productId);

        if (!!productToUpdate) {
          if (productToUpdate.amount > response.amount) {
            return toast.error("Quantidade solicitada fora de estoque");
          }
        }

        setCart(updateCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
