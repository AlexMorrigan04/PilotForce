import React, { useEffect, useState, useMemo } from 'react';
import AdminNavbar from '../components/common/Navbar';
import { useAuth } from '../context/AuthContext';
import { getSystemLogs } from '../services/adminService';
import { 
  FiSearch, 
  FiFilter, 
  FiRefreshCw, 
  FiDownload, 
  FiEye, 
  FiEyeOff,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiInfo,
  FiShield,
  FiUser,
  FiLock,
  FiSettings,
  FiDatabase,
  FiCalendar,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight
} from 'react-icons/fi';

const PAGE_SIZE = 20;

interface LogEntry {
  UserId: string;
  Timestamp: string;
  DisplayTimestamp?: string;
  Type: string;
  Action: string;
  Success: boolean;
  Severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  Details?: any;
  ResourceType?: string;
  ResourceId?: string;
  IpAddress?: string;
  UserAgent?: string;
}

const AdminSystemLogs: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedSuccess, setSelectedSuccess] = useState<string>('');
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [hideDuplicateSSO, setHideDuplicateSSO] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [page, filter, selectedSeverity, selectedType, selectedSuccess]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSystemLogs({ 
        page, 
        pageSize: PAGE_SIZE, 
        filter: `${filter} ${selectedSeverity} ${selectedType} ${selectedSuccess}`.trim() 
      });
      setLogs(response.logs || []);
      setTotal(response.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setIsLoading(false);
    }
  };

  // Process logs to handle duplicate SSO attempts
  const processedLogs = useMemo(() => {
    if (!hideDuplicateSSO) return logs;

    const processed: LogEntry[] = [];
    const ssoAttempts = new Map<string, LogEntry>();

    logs.forEach(log => {
      // Check if this is a potential duplicate SSO attempt
      if (log.Type === 'AUTHENTICATION' && log.Action.includes('OAuth')) {
        const key = `${log.IpAddress}_${log.Timestamp.split('T')[0]}`; // Same IP and date
        
        if (log.UserId === 'unknown' || log.UserId === 'pending') {
          // Store the "unknown" attempt for potential matching
          ssoAttempts.set(key, log);
        } else {
          // This is a successful SSO login with actual user ID
          const unknownAttempt = ssoAttempts.get(key);
          if (unknownAttempt) {
            // Replace the unknown attempt with the successful one
            const index = processed.findIndex(l => l === unknownAttempt);
            if (index !== -1) {
              processed[index] = log;
            }
            ssoAttempts.delete(key);
          } else {
            processed.push(log);
          }
        }
      } else {
        processed.push(log);
      }
    });

    return processed;
  }, [logs, hideDuplicateSSO]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AUTHENTICATION': return <FiUser className="w-4 h-4" />;
      case 'ACCESS_DENIED': return <FiLock className="w-4 h-4" />;
      case 'SYSTEM_ERROR': return <FiAlertTriangle className="w-4 h-4" />;
      case 'ADMIN_ACTION': return <FiSettings className="w-4 h-4" />;
      case 'PERMISSION_CHANGE': return <FiShield className="w-4 h-4" />;
      case 'SECURITY_CONFIG_CHANGE': return <FiSettings className="w-4 h-4" />;
      case 'SECURITY_EVENT': return <FiShield className="w-4 h-4" />;
      default: return <FiInfo className="w-4 h-4" />;
    }
  };

  const getSuccessIcon = (success: boolean) => {
    return success ? 
      <FiCheckCircle className="w-4 h-4 text-green-500" /> : 
      <FiXCircle className="w-4 h-4 text-red-500" />;
  };

  const formatDetails = (details: any): string => {
    if (!details) return '';
    if (typeof details === 'string') return details;
    if (typeof details === 'object') {
      return JSON.stringify(details, null, 2);
    }
    return String(details);
  };

  const toggleDetails = (logId: string) => {
    const newShowDetails = new Set(showDetails);
    if (newShowDetails.has(logId)) {
      newShowDetails.delete(logId);
    } else {
      newShowDetails.add(logId);
    }
    setShowDetails(newShowDetails);
  };

  const clearFilters = () => {
    setFilter('');
    setSelectedSeverity('');
    setSelectedType('');
    setSelectedSuccess('');
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Type', 'Action', 'Success', 'Severity', 'Resource Type', 'Resource ID', 'IP Address'],
      ...processedLogs.map(log => [
        log.DisplayTimestamp || log.Timestamp,
        log.UserId,
        log.Type,
        log.Action,
        log.Success ? 'Yes' : 'No',
        log.Severity,
        log.ResourceType || '',
        log.ResourceId || '',
        log.IpAddress || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const typeCounts = { AUTHENTICATION: 0, ACCESS_DENIED: 0, SYSTEM_ERROR: 0, ADMIN_ACTION: 0, PERMISSION_CHANGE: 0, SECURITY_CONFIG_CHANGE: 0, SECURITY_EVENT: 0 };
    const successCount = { success: 0, failed: 0 };
    const recentActivity = 0; // Count logs from last 24 hours

    processedLogs.forEach(log => {
      // Count by severity
      if (log.Severity in severityCounts) {
        severityCounts[log.Severity as keyof typeof severityCounts]++;
      }
      
      // Count by type
      if (log.Type in typeCounts) {
        typeCounts[log.Type as keyof typeof typeCounts]++;
      }
      
      // Count by success
      if (log.Success) {
        successCount.success++;
      } else {
        successCount.failed++;
      }
    });

    return {
      total: processedLogs.length,
      severityCounts,
      typeCounts,
      successCount,
      recentActivity
    };
  }, [processedLogs]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FiLock className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You do not have permission to view security logs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Security Audit Logs
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Monitor system security events and user activities
            </p>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <button
              onClick={fetchLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiRefreshCw className="mr-2" />
              Refresh
            </button>
            <button
              onClick={exportLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiDownload className="mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 rounded-md p-3">
                    <FiShield className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-green-100 rounded-md p-3">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Successful</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.successCount.success}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-red-100 rounded-md p-3">
                    <FiXCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                    <dd className="text-lg font-semibold text-gray-900">{stats.successCount.failed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="bg-orange-100 rounded-md p-3">
                    <FiAlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">High/Critical</dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.severityCounts.HIGH + stats.severityCounts.CRITICAL}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="pl-10 w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="AUTHENTICATION">Authentication</option>
                  <option value="ACCESS_DENIED">Access Denied</option>
                  <option value="SYSTEM_ERROR">System Error</option>
                  <option value="ADMIN_ACTION">Admin Action</option>
                  <option value="PERMISSION_CHANGE">Permission Change</option>
                  <option value="SECURITY_CONFIG_CHANGE">Security Config</option>
                  <option value="SECURITY_EVENT">Security Event</option>
                </select>
              </div>

              {/* Success Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedSuccess}
                  onChange={(e) => setSelectedSuccess(e.target.value)}
                  className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="true">Success</option>
                  <option value="false">Failed</option>
                </select>
              </div>

              {/* SSO Duplicate Toggle */}
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hideDuplicateSSO}
                    onChange={(e) => setHideDuplicateSSO(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Hide SSO duplicates</span>
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FiXCircle className="mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-8">
            <div className="flex">
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          /* Logs Table */
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedLogs.map((log, index) => (
                    <React.Fragment key={`${log.UserId}_${log.Timestamp}_${index}`}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100">
                              {getTypeIcon(log.Type)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {log.Type.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {log.Action}
                              </div>
                              {log.ResourceType && (
                                <div className="text-xs text-gray-400">
                                  {log.ResourceType} {log.ResourceId}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.UserId === 'unknown' || log.UserId === 'pending' ? (
                              <span className="text-gray-500 italic">Unknown/Pending</span>
                            ) : (
                              log.UserId
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.DisplayTimestamp || log.Timestamp}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(log.Severity)}`}>
                            {log.Severity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getSuccessIcon(log.Success)}
                            <span className="ml-2 text-sm text-gray-900">
                              {log.Success ? 'Success' : 'Failed'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.IpAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleDetails(`${log.UserId}_${log.Timestamp}_${index}`)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {showDetails.has(`${log.UserId}_${log.Timestamp}_${index}`) ? (
                              <FiEyeOff className="w-4 h-4" />
                            ) : (
                              <FiEye className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                      {showDetails.has(`${log.UserId}_${log.Timestamp}_${index}`) && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50">
                            <div className="text-sm">
                              <h4 className="font-medium text-gray-900 mb-2">Event Details</h4>
                              <pre className="bg-white p-4 rounded border text-xs overflow-x-auto">
                                {formatDetails(log.Details)}
                              </pre>
                              {log.UserAgent && (
                                <div className="mt-2">
                                  <span className="font-medium text-gray-700">User Agent:</span>
                                  <span className="ml-2 text-gray-600 text-xs">{log.UserAgent}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * PAGE_SIZE, total)}
                    </span>{' '}
                    of <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronsLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page} of {Math.ceil(total / PAGE_SIZE) || 1}
                    </span>
                    <button
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= Math.ceil(total / PAGE_SIZE)}
                      className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setPage(Math.ceil(total / PAGE_SIZE))}
                      disabled={page >= Math.ceil(total / PAGE_SIZE)}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiChevronsRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemLogs; 