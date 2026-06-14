"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { customersApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Users, Upload, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    msg: string;
    created?: number;
    skipped?: number;
    rebuiltCount?: number;
    failures?: { row: number; reason: string }[];
  } | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersApi.list(page, 50, search);
      setCustomers(res.data.customers);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    try {
      const res = await customersApi.upload(file);
      setUploadResult({
        msg: "Import Complete",
        created: res.data.created,
        skipped: res.data.skipped,
        rebuiltCount: res.data.rebuiltCount,
        failures: res.data.failures,
      });
      loadCustomers();
    } catch (err) {
      setUploadResult({ msg: "❌ Upload failed. Check CSV format or server connection." });
    } finally {
      setUploading(false);
    }
  }

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,phone,city\nRahul Sharma,rahul@gmail.com,9876543210,Mumbai\nPriya Singh,priya@gmail.com,9876543211,Delhi";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "customer_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Customers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total.toLocaleString()} customers in your database
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadTemplate}>
            Download Template
          </Button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="default" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Customer CSV"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {uploadResult && (
        <div className={`mb-6 p-4 rounded-lg border ${uploadResult.failures && uploadResult.failures.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
          <h3 className="font-bold mb-2">{uploadResult.msg}</h3>
          {uploadResult.created !== undefined && (
            <div className="text-sm space-y-1">
              <p>Customers Imported: {uploadResult.created}</p>
              <p>Customers Skipped: {uploadResult.skipped}</p>
              {uploadResult.rebuiltCount !== undefined && <p>Profiles Rebuilt: {uploadResult.rebuiltCount}</p>}
            </div>
          )}
          {uploadResult.failures && uploadResult.failures.length > 0 && (
            <div className="mt-3 text-sm text-red-600">
              <p className="font-semibold mb-1">Failure Reasons:</p>
              <ul className="list-disc pl-5 space-y-1 max-h-32 overflow-y-auto">
                {uploadResult.failures.map((f, i) => (
                  <li key={i}>Row {f.row} &rarr; {f.reason}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CSV Format hint */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        CSV format: <code>name, email, phone, city, createdAt</code>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or city..."
          className="pl-10"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">City</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      Loading...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-12 h-12 text-muted" />
                        <p className="text-lg font-medium text-foreground">No customers uploaded yet.</p>
                        <p>Upload customers and orders to generate AI customer profiles.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c._id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{c.name}</td>
                      <td className="p-4 text-muted-foreground">{c.email}</td>
                      <td className="p-4 text-muted-foreground">{c.phone}</td>
                      <td className="p-4">
                        <Badge variant="secondary">{c.city}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
