import { useState, useCallback } from "react";
import { documentsApi } from "../utils/api";
import showToast from "../components/ui/Toast";

/**
 * Hook for fetching and managing documents.
 * Wraps the documentsApi with loading/error state.
 */
export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsApi.list(params);
      const docs = Array.isArray(res.data) ? res.data : (res.data?.documents || []);
      setDocuments(docs);
      return docs;
    } catch (err) {
      setError(err.message);
      showToast.error("Failed to load documents");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocument = useCallback(async (id) => {
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      showToast.success("Document deleted");
      return true;
    } catch (err) {
      showToast.error(err.message || "Failed to delete document");
      return false;
    }
  }, []);

  const reindexDocument = useCallback(async (id) => {
    try {
      await documentsApi.reindex(id);
      showToast.success("Re-indexing started");
      return true;
    } catch (err) {
      showToast.error(err.message || "Failed to reindex");
      return false;
    }
  }, []);

  return { documents, loading, error, fetchDocuments, deleteDocument, reindexDocument };
}

export default useDocuments;
