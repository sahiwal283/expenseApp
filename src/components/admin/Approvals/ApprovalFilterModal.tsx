import React from 'react';
import { X, Filter, Search } from 'lucide-react';
import { TradeShow, User } from '../../../App';

interface ApprovalFilterModalProps {
  show: boolean;
  searchTerm: string;
  filterStatus: string;
  filterCategory: string;
  filterEvent: string;
  filterUser: string;
  filterReimbursement: string;
  filterEntity: string;
  categories: string[];
  events: TradeShow[];
  users: User[];
  entityOptions: string[];
  hasActiveFilters: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onEventChange: (value: string) => void;
  onUserChange: (value: string) => void;
  onReimbursementChange: (value: string) => void;
  onEntityChange: (value: string) => void;
  onClearAll: () => void;
}

export const ApprovalFilterModal: React.FC<ApprovalFilterModalProps> = ({
  show,
  searchTerm,
  filterStatus,
  filterCategory,
  filterEvent,
  filterUser,
  filterReimbursement,
  filterEntity,
  categories,
  events,
  users,
  entityOptions,
  onClose,
  onSearchChange,
  onStatusChange,
  onCategoryChange,
  onEventChange,
  onUserChange,
  onReimbursementChange,
  onEntityChange,
  onClearAll,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sticky top-0 bg-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Filter Expenses</h3>
              <p className="text-xs sm:text-sm text-gray-600">Refine your expense search</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search expenses..."
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* First Row: Status, Category, Event */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event
                </label>
                <select
                  value={filterEvent}
                  onChange={(e) => onEventChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Events</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Second Row: User, Reimbursement, Entity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => onUserChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Users</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reimbursement
                </label>
                <select
                  value={filterReimbursement}
                  onChange={(e) => onReimbursementChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Reimbursement</option>
                  <option value="required">Required</option>
                  <option value="not-required">Not Required</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity
                </label>
                <select
                  value={filterEntity}
                  onChange={(e) => onEntityChange(e.target.value)}
                  className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Entities</option>
                  <option value="unassigned">Unassigned</option>
                  {entityOptions.map((entity, index) => (
                    <option key={index} value={entity}>{entity}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 lg:py-4 bg-gray-50 rounded-b-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-t border-gray-200">
          <button
            onClick={onClearAll}
            className="px-3 sm:px-4 py-2 min-h-[44px] text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-emerald-600 transition-all duration-200"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

