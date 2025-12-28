import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Search, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { packageAPI } from '../services/api';

const PackageManagement = () => {
  const [activeTab, setActiveTab] = useState('installed');
  const [packages, setPackages] = useState([]);
  const [updates, setUpdates] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'installed') {
      loadPackages();
    } else if (activeTab === 'updates') {
      checkUpdates();
    }
  }, [activeTab, page]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const result = await packageAPI.listPackages(page, 50, searchQuery);
      setPackages(result.packages || []);
      setPagination(result.pagination || pagination);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUpdates = async () => {
    setLoading(true);
    try {
      const result = await packageAPI.checkUpdates();
      setUpdates(result);
    } catch (error) {
      setUpdates({ available: false, error: error.response?.data?.detail || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const result = await packageAPI.searchPackages(searchQuery);
      setSearchResults(result.results || []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const tabs = [
    { id: 'installed', label: 'Installed Packages', icon: Package },
    { id: 'updates', label: 'System Updates', icon: Download },
    { id: 'search', label: 'Search Packages', icon: Search },
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Package Management</h1>
          </div>
          {activeTab !== 'search' && (
            <button
              onClick={() => activeTab === 'installed' ? loadPackages() : checkUpdates()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {/* Installed Packages Tab */}
        {activeTab === 'installed' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search installed packages..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && loadPackages()}
              />
              <button
                onClick={loadPackages}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading packages...</div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Total: {pagination.total} packages | Page {pagination.page} of {pagination.pages}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Package Name</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {packages.map((pkg, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{pkg.name}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{pkg.version}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs">
                              {pkg.status || 'installed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination.pages > 1 && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {pagination.pages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.pages}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === 'updates' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Updates</h2>
            {loading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Checking for updates...</div>
            ) : updates ? (
              <div>
                {updates.error ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Error: {updates.error}</span>
                    </div>
                  </div>
                ) : updates.available ? (
                  <div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                        <Download className="h-5 w-5" />
                        <span className="font-medium">
                          {updates.count || 0} update{updates.count !== 1 ? 's' : ''} available
                        </span>
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                        Package Manager: {updates.package_manager}
                      </div>
                    </div>
                    {updates.packages && updates.packages.length > 0 && (
                      <div className="overflow-auto max-h-96">
                        <ul className="space-y-2">
                          {updates.packages.map((pkg, idx) => (
                            <li key={idx} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{typeof pkg === 'string' ? pkg : pkg.name || pkg}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-800 dark:text-green-200">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">System is up to date</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No update information available</div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Search Packages</h2>
            <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter package name to search..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {searchLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div>
                <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Package Name</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Manager</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {searchResults.map((result, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{result.name}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{result.description || '-'}</td>
                          <td className="px-4 sm:px-6 py-4 text-sm">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                              {result.manager || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">No packages found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PackageManagement;

