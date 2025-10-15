import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, X, AlertTriangle, Check } from 'lucide-react';
import { api } from '../../utils/api';

interface Role {
  id: string;
  name: string;
  label: string;
  description?: string;
  color?: string;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    description: '',
    color: 'bg-gray-100 text-gray-800'
  });

  // Load roles
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const data = await api.getRoles();
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingRole) {
        // Update existing role
        await api.updateRole(editingRole.id, {
          label: formData.label,
          description: formData.description,
          color: formData.color
        });
      } else {
        // Create new role
        await api.createRole({
          name: formData.name,
          label: formData.label,
          description: formData.description,
          color: formData.color
        });
      }

      await loadRoles();
      handleCloseForm();
    } catch (error: any) {
      console.error('Error saving role:', error);
      alert(error.response?.data?.error || 'Failed to save role');
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      label: role.label,
      description: role.description || '',
      color: role.color || 'bg-gray-100 text-gray-800'
    });
    setShowForm(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      alert('System roles cannot be deleted');
      return;
    }

    if (!confirm(`Are you sure you want to delete the role "${role.label}"?`)) {
      return;
    }

    try {
      await api.deleteRole(role.id);
      await loadRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      alert(error.response?.data?.error || 'Failed to delete role');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRole(null);
    setFormData({
      name: '',
      label: '',
      description: '',
      color: 'bg-gray-100 text-gray-800'
    });
  };

  // Color options for roles
  const colorOptions = [
    { value: 'bg-purple-100 text-purple-800', label: 'Purple' },
    { value: 'bg-blue-100 text-blue-800', label: 'Blue' },
    { value: 'bg-emerald-100 text-emerald-800', label: 'Green' },
    { value: 'bg-orange-100 text-orange-800', label: 'Orange' },
    { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
    { value: 'bg-red-100 text-red-800', label: 'Red' },
    { value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
    { value: 'bg-pink-100 text-pink-800', label: 'Pink' },
    { value: 'bg-teal-100 text-teal-800', label: 'Teal' },
    { value: 'bg-gray-100 text-gray-800', label: 'Gray' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Role Management</h2>
          <p className="text-sm text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Role</span>
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <div
            key={role.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${role.color}`}>
                  {role.label}
                </span>
              </div>
              {role.is_system && (
                <span className="text-xs text-blue-600 font-medium">System</span>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-3 min-h-[40px]">
              {role.description || 'No description'}
            </p>

            <div className="text-xs text-gray-500 mb-3">
              Role name: <span className="font-mono">{role.name}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditRole(role)}
                className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              {!role.is_system && (
                <button
                  onClick={() => handleDeleteRole(role)}
                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h3>
              <button
                onClick={handleCloseForm}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSaveRole} className="p-6 space-y-4">
              {/* Role Name (only for new roles) */}
              {!editingRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name (Internal) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., project_manager"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lowercase, no spaces (will be converted automatically)
                  </p>
                </div>
              )}

              {/* Role Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Label *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Project Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role's responsibilities..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Badge Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: option.value })}
                      className={`relative p-2 rounded-lg border-2 transition-all ${
                        formData.color === option.value
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`${option.value} px-2 py-1 rounded text-xs font-medium text-center`}>
                        {option.label.slice(0, 3)}
                      </div>
                      {formData.color === option.value && (
                        <Check className="absolute top-0 right-0 w-3 h-3 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* System Role Warning */}
              {editingRole?.is_system && (
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">System Role</p>
                    <p className="text-xs mt-1">The role name cannot be changed for system roles.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

