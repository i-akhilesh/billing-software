
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import Items from './pages/Items';
import Inventory from './pages/Inventory';
import ItemForm from './pages/ItemForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceView from './pages/InvoiceView';
import Layout from './components/Layout';

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <ThemeProvider>
                    <DataProvider>
                        <Router>
                            <Routes>
                                <Route path="/login" element={<Login />} />
                                <Route
                                    element={
                                        <ProtectedRoute>
                                            <Layout />
                                        </ProtectedRoute>
                                    }
                                >
                                    <Route path="/" element={<Dashboard />} />
                                    <Route path="/customers" element={<Customers />} />
                                    <Route path="/customers/new" element={<CustomerForm />} />
                                    <Route path="/customers/:id/edit" element={<CustomerForm />} />
                                    <Route path="/items" element={<Items />} />
                                    <Route path="/items/new" element={<ItemForm />} />
                                    <Route path="/items/:id/edit" element={<ItemForm />} />
                                    <Route path="/inventory" element={<Inventory />} />
                                    <Route path="/invoices" element={<Invoices />} />
                                    <Route path="/invoices/new" element={<InvoiceForm />} />
                                    <Route path="/invoices/:id" element={<InvoiceView />} />
                                    <Route path="/invoices/:id/edit" element={<InvoiceForm />} />
                                </Route>
                            </Routes>
                        </Router>
                    </DataProvider>
                </ThemeProvider>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
