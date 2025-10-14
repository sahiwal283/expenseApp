import React, { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit2, Trash2, Search, UserCheck, UserX, Mail, AlertTriangle, X } from 'lucide-react';
import { User, UserRole } from '../../App';
import { api } from '../../utils/api';

interface UserManagementProps {
  user: User;
}

export const UserManagement: React.FC<UserManagementProps> = ({ user: currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activatingUser, setActivatingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('salesperson');

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'salesperson' as UserRole
  });

  useEffect(() => {
    (async () => {
      if (api.USE_SERVER) {
        try {
          const data = await api.getUsers();
          setUsers(data || []);
        } catch {
          setUsers([]);
        }
      } else {
        const storedUsers = localStorage.getItem('tradeshow_users');
        if (storedUsers) setUsers(JSON.parse(storedUsers));
      }
    })();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (api.USE_SERVER) {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          ...(formData.password ? { password: formData.password } : {}),
        });
      } else {
        await api.createUser({
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        });
      }
      const refreshed = await api.getUsers();
      setUsers(refreshed || []);
    } else {
      const newUser: User = { id: editingUser?.id || Date.now().toString(), ...formData } as User;
      const updatedUsers = editingUser ? users.map(u => u.id === editingUser.id ? newUser : u) : [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('tradeshow_users', JSON.stringify(updatedUsers));
      if (formData.password) localStorage.setItem(`user_password_${newUser.username}`, formData.password);
    }
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', password: '', role: 'salesperson' });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '', // Don't pre-fill password
      role: user.role
    });
    setShowForm(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser.id) {
      alert("You cannot delete your own account!");
      return;
    }
    if (api.USE_SERVER) {
      await api.deleteUser(userId);
      const refreshed = await api.getUsers();
      setUsers(refreshed || []);
    } else {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('tradeshow_users', JSON.stringify(updatedUsers));
    }
  };

  const handleInviteUser = (userId: string) => {
    // Simulate sending invitation email
    const user = users.find(u => u.id === userId);
    if (user) {
      alert(`Invitation email sent to ${user.email}`);
    }
  };

  const handleActivateUser = async () => {
    if (!activatingUser) return;
    
    try {
      await api.updateUser(activatingUser.id, {
        name: activatingUser.name,
        email: activatingUser.email,
        role: selectedRole,
      });
      const refreshed = await api.getUsers();
      setUsers(refreshed || []);
      setShowActivationModal(false);
      setActivatingUser(null);
      alert(`User ${activatingUser.name} activated with role: ${getRoleLabel(selectedRole)}`);
    } catch (error) {
      console.error('Failed to activate user:', error);
      alert('Failed to activate user');
    }
  };

  const openActivationModal = (user: User) => {
    setActivatingUser(user);
    setSelectedRole('salesperson'); // Default
    setShowActivationModal(true);
  };

  const isPendingUser = (user: User) => {
    return user.role === 'pending';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    const colors = {
      'admin': 'bg-purple-100 text-purple-800',
      'coordinator': 'bg-blue-100 text-blue-800',
      'salesperson': 'bg-emerald-100 text-emerald-800',
      'accountant': 'bg-orange-100 text-orange-800',
      'pending': 'bg-yellow-100 text-yellow-800'
    };
    return colors[role as keyof typeof colors] || 'bg-yellow-100 text-yellow-800';
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      'admin': 'Administrator',
      'coordinator': 'Show Coordinator',
      'salesperson': 'Sales Person',
      'accountant': 'Accountant',
      'pending': 'Pending Approval'
    };
    return labels[role as keyof typeof labels] || 'Pending Approval';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage team members and their access levels</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add User</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="coordinator">Show Coordinator</option>
            <option value="salesperson">Sales Person</option>
            <option value="accountant">Accountant</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">User</th>
                <th className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">Role</th>
                <th className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                <th className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-right text-xs sm:text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">{user.username} • {user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
                    {isPendingUser(user) ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending Role
                      </span>
                    ) : (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4">
                    {isPendingUser(user) ? (
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                        <span className="text-sm text-yellow-600 font-medium">Awaiting Activation</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <UserCheck className="w-4 h-4 text-emerald-600 mr-2" />
                        <span className="text-sm text-emerald-600 font-medium">Active</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {isPendingUser(user) ? (
                        <button
                          onClick={() => openActivationModal(user)}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 flex items-center space-x-2"
                          title="Activate User"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Activate User</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleInviteUser(user.id)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Send Invitation"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === currentUser.id}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activation Modal */}
      {showActivationModal && activatingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Activate User</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Assign a role to activate this account</p>
                </div>
              </div>
              <button
                onClick={() => setShowActivationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {activatingUser.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{activatingUser.name}</div>
                  <div className="text-xs sm:text-sm text-gray-600">{activatingUser.username} • {activatingUser.email}</div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="salesperson">Salesperson</option>
                <option value="coordinator">Event Coordinator</option>
                <option value="accountant">Accountant</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                This will activate the user and allow them to log in with their chosen credentials.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowActivationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateUser}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-lg hover:from-emerald-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Activate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 md:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  setFormData({ name: '', username: '', email: '', role: 'salesperson' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password {editingUser ? '(Optional - Leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!editingUser}
                  placeholder={editingUser ? 'Enter new password to reset' : 'Create password'}
                />
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Leave blank to keep the current password</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="admin">Administrator</option>
                  <option value="accountant">Accountant</option>
                  <option value="coordinator">Show Coordinator</option>
                  <option value="salesperson">Sales Person</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setFormData({ name: '', username: '', email: '', password: '', role: 'salesperson' });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
                >
                  {editingUser ? 'Update' : 'Add'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};