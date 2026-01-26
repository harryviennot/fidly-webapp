import CustomerTable from '@/components/customer-table';

export const metadata = {
  title: 'Admin Dashboard - Coffee Shop',
  description: 'Manage customer loyalty cards',
};

export default function AdminPage() {
  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <div className="logo">☕</div>
          <div>
            <h1>Admin Dashboard</h1>
            <p className="subtitle">Manage customer loyalty cards</p>
          </div>
        </div>

        <CustomerTable />
      </div>
    </div>
  );
}
