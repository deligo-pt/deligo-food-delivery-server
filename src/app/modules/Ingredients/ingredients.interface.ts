

export interface IIngredients {
    name: string;
    category: string;
    description?: string;
    sku: string;
    price: number;
    stock: number;
    minOrder?: number;
    image: string;
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}