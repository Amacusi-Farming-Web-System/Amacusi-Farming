import { 
    db, 
    COLLECTIONS 
} from "../admin/firebase.js";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showError } from './utils.js';

export async function fetchOrders(startDate, endDate) {
    try {
        const ordersRef = collection(db, COLLECTIONS.ORDERS);
        const q = query(
            ordersRef,
            where('createdAt', '>=', Timestamp.fromDate(startDate)),
            where('createdAt', '<=', Timestamp.fromDate(endDate)),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error('Error fetching orders:', error);
        showError('Failed to fetch orders data');
        return [];
    }
}

export async function fetchProducts() {
    try {
        const productsRef = collection(db, COLLECTIONS.PRODUCTS);
        const querySnapshot = await getDocs(productsRef);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching products:', error);
        showError('Failed to fetch products data');
        return [];
    }
}

export async function fetchCustomers() {
    try {
        const customersRef = collection(db, COLLECTIONS.USERS);
        const querySnapshot = await getDocs(customersRef);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            lastLogin: doc.data().lastLogin?.toDate?.() || null
        }));
    } catch (error) {
        console.error('Error fetching customers:', error);
        showError('Failed to fetch customers data');
        return [];
    }
}

export async function initDataFetchers() {
    return Promise.resolve();
}
