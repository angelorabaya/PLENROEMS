const API_BASE = 'http://' + window.location.hostname + ':5000';

const getHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        try {
            const user = JSON.parse(saved);
            if (user.log_user) headers['x-log-user'] = user.log_user;
            if (user.log_cname) headers['x-log-cname'] = user.log_cname;
        } catch (e) {
            console.error('Error parsing user for headers', e);
        }
    }
    return headers;
};

export const api = {
    login: async (username, password) => {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ log_user: username, log_pass: password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Invalid username or password');
        }
        const user = await response.json();
        return user;
    },

    getClients: async () => {
        const response = await fetch(`${API_BASE}/api/clients`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to fetch clients');
        }
        return response.json();
    },

    createClient: async (data) => {
        const response = await fetch(`${API_BASE}/api/clients`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create client');
        return response.json();
    },

    updateClient: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/clients/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update client');
        return response.json();
    },

    deleteClient: async (id) => {
        const response = await fetch(`${API_BASE}/api/clients/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete client');
        return response.json();
    },

    getPermitTypes: async () => {
        const response = await fetch(`${API_BASE}/api/permittypes`);
        if (!response.ok) throw new Error('Failed to fetch permit types');
        return response.json();
    },

    createPermitType: async (data) => {
        const response = await fetch(`${API_BASE}/api/permittypes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create permit type');
        return response.json();
    },

    updatePermitType: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/permittypes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update permit type');
        return response.json();
    },

    deletePermitType: async (id) => {
        const response = await fetch(`${API_BASE}/api/permittypes/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete permit type');
        return response.json();
    },

    getPermitReqs: async () => {
        const response = await fetch(`${API_BASE}/api/permitreqs`);
        if (!response.ok) throw new Error('Failed to fetch permit requirements');
        return response.json();
    },

    createPermitReq: async (data) => {
        const response = await fetch(`${API_BASE}/api/permitreqs`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create permit requirement');
        return response.json();
    },

    updatePermitReq: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/permitreqs/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update permit requirement');
        return response.json();
    },

    deletePermitReq: async (id) => {
        const response = await fetch(`${API_BASE}/api/permitreqs/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete permit requirement');
        return response.json();
    },

    // Commodity CRUD
    getCommodities: async () => {
        const response = await fetch(`${API_BASE}/api/commodities`);
        if (!response.ok) throw new Error('Failed to fetch commodities');
        return response.json();
    },

    createCommodity: async (data) => {
        const response = await fetch(`${API_BASE}/api/commodities`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create commodity');
        return response.json();
    },

    updateCommodity: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/commodities/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update commodity');
        return response.json();
    },

    deleteCommodity: async (id) => {
        const response = await fetch(`${API_BASE}/api/commodities/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete commodity');
        return response.json();
    },

    // Nature of Payment
    getNatureOfPaymentList: async () => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentlist`);
        if (!response.ok) throw new Error('Failed to fetch nature of payments');
        return response.json();
    },

    getNatureOfPaymentDetailsByNature: async (npCtrlno) => {
        const response = await fetch(
            `${API_BASE}/api/natureofpaymentdetails/${encodeURIComponent(npCtrlno)}`
        );
        if (!response.ok) throw new Error('Failed to fetch nature of payment details');
        return response.json();
    },

    getNatureOfPaymentMeasures: async () => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentmeasures`);
        if (!response.ok) throw new Error('Failed to fetch measures');
        return response.json();
    },

    createNatureOfPaymentDetail: async (data) => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentdetails`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create nature of payment detail');
        return response.json();
    },

    updateNatureOfPaymentDetail: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentdetails/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update nature of payment detail');
        return response.json();
    },

    deleteNatureOfPaymentDetail: async (id) => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentdetails/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete nature of payment detail');
        return response.json();
    },

    getVehicleRegistrations: async () => {
        const response = await fetch(`${API_BASE}/api/vehicleregistrations`);
        if (!response.ok) throw new Error('Failed to fetch vehicle registrations');
        return response.json();
    },

    createVehicleRegistration: async (data) => {
        const response = await fetch(`${API_BASE}/api/vehicleregistrations`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create vehicle registration');
        return response.json();
    },

    updateVehicleRegistration: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/vehicleregistrations/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update vehicle registration');
        return response.json();
    },

    deleteVehicleRegistration: async (id) => {
        const response = await fetch(`${API_BASE}/api/vehicleregistrations/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete vehicle registration');
        return response.json();
    },

    getPaymentRegistrations: async () => {
        const response = await fetch(`${API_BASE}/api/paymentregistrations`);
        if (!response.ok) throw new Error('Failed to fetch payment registrations');
        return response.json();
    },

    getAssessmentClients: async () => {
        const response = await fetch(`${API_BASE}/api/clients/assessment`);
        if (!response.ok) throw new Error('Failed to fetch assessment clients');
        return response.json();
    },

    getNatureOfPayments: async () => {
        const response = await fetch(`${API_BASE}/api/natureofpayment`);
        if (!response.ok) throw new Error('Failed to fetch nature of payments');
        return response.json();
    },

    getNatureOfPaymentDetails: async (np_ctrlno) => {
        const response = await fetch(`${API_BASE}/api/natureofpaymentdetails/${np_ctrlno}`);
        if (!response.ok) throw new Error('Failed to fetch payment details');
        return response.json();
    },

    getMunicipalities: async () => {
        const response = await fetch(`${API_BASE}/api/municipalities`);
        if (!response.ok) throw new Error('Failed to fetch municipalities');
        return response.json();
    },

    getBarangays: async (municipality) => {
        const response = await fetch(
            `${API_BASE}/api/municipalities/${encodeURIComponent(municipality)}/barangays`
        );
        if (!response.ok) throw new Error('Failed to fetch barangays');
        return response.json();
    },

    getVehicleRegistry: async () => {
        const response = await fetch(`${API_BASE}/api/vehiclereg`);
        if (!response.ok) throw new Error('Failed to fetch vehicle registry');
        return response.json();
    },

    createAssessment: async (data) => {
        const response = await fetch(`${API_BASE}/api/assessments`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to save assessment');
        }
        return result;
    },

    deletePaymentRegistration: async (id) => {
        const response = await fetch(`${API_BASE}/api/paymentregistrations/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete payment registration');
        return response.json();
    },

    getAssessmentByControl: async (controlNo) => {
        const response = await fetch(
            `${API_BASE}/api/assessments/${encodeURIComponent(controlNo)}`
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to fetch assessment');
        }
        return result;
    },

    getTransactionClients: async () => {
        const response = await fetch(`${API_BASE}/api/clienttransactions`);
        if (!response.ok) throw new Error('Failed to fetch transaction clients');
        return response.json();
    },

    getTransactionDetails: async (clientId) => {
        const response = await fetch(`${API_BASE}/api/assessmentdetails/${clientId}`);
        if (!response.ok) throw new Error('Failed to fetch transaction details');
        return response.json();
    },

    getNatureOfPayment: async (clientId) => {
        const response = await fetch(`${API_BASE}/api/clienttransactions/${clientId}/nature`);
        if (!response.ok) throw new Error('Failed to fetch nature of payment options');
        return response.json();
    },

    getNewApplicationClients: async () => {
        const response = await fetch(`${API_BASE}/api/newapplication/clients`);
        if (!response.ok) throw new Error('Failed to fetch clients with permits');
        return response.json();
    },

    getNewApplicationRequirements: async (permitNo) => {
        const response = await fetch(
            `${API_BASE}/api/newapplication/requirements/${encodeURIComponent(permitNo)}`
        );
        if (!response.ok) throw new Error('Failed to fetch permit requirements');
        return response.json();
    },

    checkNewApplicationAttachment: async (filename) => {
        const response = await fetch(
            `${API_BASE}/api/newapplication/preview/${encodeURIComponent(filename)}`
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Attachment not accessible');
        }
        return result;
    },

    checkAttachmentsBatch: async (filenames) => {
        const response = await fetch(`${API_BASE}/api/newapplication/preview/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames }),
        });
        if (!response.ok) throw new Error('Failed to check attachments');
        return response.json();
    },

    getNewApplicationAttachmentUrl: (filename) => {
        return `${API_BASE}/api/newapplication/previewfile/${encodeURIComponent(filename)}`;
    },

    getNewApplicationAttachmentBase64: async (filename) => {
        const response = await fetch(
            `${API_BASE}/api/newapplication/previewfile/base64/${encodeURIComponent(filename)}`
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Attachment not accessible');
        }
        return result;
    },

    updateNewApplicationRequirementAttachment: async ({
        permitNo,
        description,
        fileName,
        attached,
    }) => {
        const response = await fetch(`${API_BASE}/api/newapplication/requirements/attachment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permitNo, description, fileName, attached }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update attachment');
        }
        return result;
    },

    getProductionAuditClients: async () => {
        const response = await fetch(`${API_BASE}/api/productionaudit/clients`);
        if (!response.ok) throw new Error('Failed to fetch production audit clients');
        return response.json();
    },

    getPermitHolderPermits: async (clientId) => {
        const response = await fetch(
            `${API_BASE}/api/permitholder/permits/${encodeURIComponent(clientId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch permit holder permits');
        return response.json();
    },

    createPermitHolderPermit: async (data) => {
        const response = await fetch(`${API_BASE}/api/permitholder/permits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create permit');
        return result;
    },

    updatePermitHolderPermit: async (id, data) => {
        const response = await fetch(
            `${API_BASE}/api/permitholder/permits/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update permit');
        return result;
    },

    deletePermitHolderPermit: async (id) => {
        const response = await fetch(
            `${API_BASE}/api/permitholder/permits/${encodeURIComponent(id)}`,
            {
                method: 'DELETE',
            }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to delete permit');
        return result;
    },

    getProductionAuditPermits: async (clientId) => {
        const response = await fetch(
            `${API_BASE}/api/productionaudit/permits/${encodeURIComponent(clientId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch production audit permits');
        return response.json();
    },

    getProductionAuditData: async (permitNo, clientId) => {
        const response = await fetch(
            `${API_BASE}/api/productionaudit/production/${encodeURIComponent(permitNo)}?clientId=${encodeURIComponent(
                clientId || ''
            )}`
        );
        if (!response.ok) throw new Error('Failed to fetch production audit data');
        return response.json();
    },

    createProductionAuditEntry: async ({ permitNo, date, volumeExtracted, volumeSold }) => {
        const response = await fetch(`${API_BASE}/api/productionaudit/production`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ permitNo, date, volumeExtracted, volumeSold }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create production data');
        }
        return result;
    },

    updateProductionAuditEntry: async ({ id, permitNo, date, volumeExtracted, volumeSold }) => {
        const response = await fetch(
            `${API_BASE}/api/productionaudit/production/${encodeURIComponent(id)}`,
            {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ permitNo, date, volumeExtracted, volumeSold }),
            }
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update production data');
        }
        return result;
    },

    deleteProductionAuditEntry: async (id) => {
        const response = await fetch(
            `${API_BASE}/api/productionaudit/production/${encodeURIComponent(id)}`,
            {
                method: 'DELETE',
                headers: getHeaders(),
            }
        );
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete production data');
        }
        return result;
    },

    getDocumentReceiving: async () => {
        const response = await fetch(`${API_BASE}/api/docreceiving`);
        if (!response.ok) throw new Error('Failed to fetch document receiving records');
        return response.json();
    },

    getDocReceivingNextControl: async () => {
        const response = await fetch(`${API_BASE}/api/docreceiving/maxcontrol`);
        if (!response.ok) throw new Error('Failed to get next control number');
        return response.json();
    },

    getDocReceivingEmployees: async () => {
        const response = await fetch(`${API_BASE}/api/docreceiving/employees`);
        if (!response.ok) throw new Error('Failed to fetch employees');
        return response.json();
    },

    createDocumentReceiving: async (data) => {
        const response = await fetch(`${API_BASE}/api/docreceiving`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create record');
        return result;
    },

    updateDocumentReceiving: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/docreceiving/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update record');
        return result;
    },

    deleteDocumentReceiving: async (id) => {
        const response = await fetch(`${API_BASE}/api/docreceiving/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to delete record');
        return result;
    },

    getActivityLogs: async () => {
        const response = await fetch(`${API_BASE}/api/activitylogs`);
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        return response.json();
    },

    // Document Outgoing API functions
    getDocumentOutgoing: async () => {
        const response = await fetch(`${API_BASE}/api/docoutgoing`);
        if (!response.ok) throw new Error('Failed to fetch document outgoing records');
        return response.json();
    },

    getDocOutgoingNextControl: async () => {
        const response = await fetch(`${API_BASE}/api/docoutgoing/maxcontrol`);
        if (!response.ok) throw new Error('Failed to get next control number');
        return response.json();
    },

    getDocOutgoingEmployees: async () => {
        const response = await fetch(`${API_BASE}/api/docreceiving/employees`);
        if (!response.ok) throw new Error('Failed to fetch employees');
        return response.json();
    },

    createDocumentOutgoing: async (data) => {
        const response = await fetch(`${API_BASE}/api/docoutgoing`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create record');
        return result;
    },

    updateDocumentOutgoing: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/docoutgoing/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update record');
        return result;
    },

    deleteDocumentOutgoing: async (id) => {
        const response = await fetch(`${API_BASE}/api/docoutgoing/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to delete record');
        return result;
    },

    // Document Probing (Search) API functions
    searchDocuments: async (params) => {
        const queryString = new URLSearchParams(
            Object.fromEntries(Object.entries(params).filter(([_, v]) => v))
        ).toString();
        const response = await fetch(`${API_BASE}/api/docprobing/search?${queryString}`);
        if (!response.ok) throw new Error('Failed to search documents');
        return response.json();
    },

    // Dashboard Stats
    getDashboardStats: async (params) => {
        let url = `${API_BASE}/api/dashboard/stats`;
        if (params?.year1 && params?.year2) {
            url += `?year1=${params.year1}&year2=${params.year2}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        return response.json();
    },

    // Reports
    getReportAvailableYears: async () => {
        const response = await fetch(`${API_BASE}/api/reports/available-years`);
        if (!response.ok) throw new Error('Failed to fetch available years');
        return response.json();
    },

    getComparativeIncome: async (year) => {
        const response = await fetch(`${API_BASE}/api/reports/comparative-income?year=${year}`);
        if (!response.ok) throw new Error('Failed to fetch comparative income report');
        return response.json();
    },

    getRevenueCollection: async (year, month) => {
        const response = await fetch(
            `${API_BASE}/api/reports/revenue-collection?year=${year}&month=${encodeURIComponent(month)}`
        );
        if (!response.ok) throw new Error('Failed to fetch revenue collection report');
        return response.json();
    },

    getBarangayShare: async (year, municipality, barangay) => {
        const params = new URLSearchParams({
            year: year.toString(),
            municipality,
            barangay,
        });
        const response = await fetch(`${API_BASE}/api/reports/barangay-share?${params}`);
        if (!response.ok) throw new Error('Failed to fetch barangay share report');
        return response.json();
    },

    getMunicipalShare: async (year, municipality) => {
        const params = new URLSearchParams({
            year: year.toString(),
            municipality,
        });
        const response = await fetch(`${API_BASE}/api/reports/municipal-share?${params}`);
        if (!response.ok) throw new Error('Failed to fetch municipal share report');
        return response.json();
    },

    getActivePermittees: async () => {
        const response = await fetch(`${API_BASE}/api/reports/active-permittees`);
        if (!response.ok) throw new Error('Failed to fetch active permittees report');
        return response.json();
    },

    getDeliveryReceipts: async (clientId) => {
        const response = await fetch(
            `${API_BASE}/api/deliveryreceipts/${encodeURIComponent(clientId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch delivery receipts');
        return response.json();
    },

    createDeliveryReceipt: async (data) => {
        const response = await fetch(`${API_BASE}/api/deliveryreceipts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create delivery receipt');
        return response.json();
    },

    updateDeliveryReceipt: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/deliveryreceipts/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update delivery receipt');
        return response.json();
    },

    deleteDeliveryReceipt: async (id) => {
        const response = await fetch(`${API_BASE}/api/deliveryreceipts/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete delivery receipt');
        return response.json();
    },

    // Task Force API functions
    getTaskforceMunicipalities: async () => {
        const response = await fetch(`${API_BASE}/api/taskforce/municipalities`);
        if (!response.ok) throw new Error('Failed to fetch municipalities');
        return response.json();
    },

    getTaskforceCommodities: async () => {
        const response = await fetch(`${API_BASE}/api/taskforce/commodities`);
        if (!response.ok) throw new Error('Failed to fetch commodities');
        return response.json();
    },

    getTaskforceClients: async () => {
        const response = await fetch(`${API_BASE}/api/taskforce/clients`);
        if (!response.ok) throw new Error('Failed to fetch clients');
        return response.json();
    },

    getTaskforceCheckers: async () => {
        const response = await fetch(`${API_BASE}/api/taskforce/checkers`);
        if (!response.ok) throw new Error('Failed to fetch checkers');
        return response.json();
    },

    validateTaskforceDR: async (drNumber) => {
        const params = new URLSearchParams({ drNumber });
        const response = await fetch(`${API_BASE}/api/taskforce/validate-dr?${params}`);
        if (!response.ok) throw new Error('Failed to validate DR');
        return response.json();
    },

    checkTaskforceDuplicateDR: async (drNumber, excludeId) => {
        const params = new URLSearchParams({ drNumber });
        if (excludeId) params.append('excludeId', excludeId);

        const response = await fetch(`${API_BASE}/api/taskforce/check-duplicate?${params}`);
        if (!response.ok) throw new Error('Failed to check duplicate DR');
        return response.json();
    },

    getTaskforceRecords: async (area, date) => {
        const params = new URLSearchParams({ area, date });
        const response = await fetch(`${API_BASE}/api/taskforce?${params}`);
        if (!response.ok) throw new Error('Failed to fetch task force records');
        return response.json();
    },

    createTaskforceRecord: async (data) => {
        const response = await fetch(`${API_BASE}/api/taskforce`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create task force record');
        return response.json();
    },

    updateTaskforceRecord: async (id, data) => {
        const response = await fetch(`${API_BASE}/api/taskforce/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update task force record');
        return response.json();
    },

    deleteTaskforceRecord: async (id) => {
        const response = await fetch(`${API_BASE}/api/taskforce/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete task force record');
        return response.json();
    },
};
