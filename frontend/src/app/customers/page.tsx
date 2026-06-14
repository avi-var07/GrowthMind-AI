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
  const [uploadMsg, setUploadMsg] = useState("");

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
    setUploadMsg("");
    try {
      const res = await customersApi.upload(file);
      setUploadMsg(
        `✅ Imported ${res.data.created} customers (${res.data.skipped} skipped)`
      );
      loadCustomers();
    } catch (err) {
      setUploadMsg("❌ Upload failed. Check CSV format.");
    } finally {
      setUploading(false);
    }
  }

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
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Import CSV"}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {uploadMsg && (
        <div className="mb-4 p-3 bg-muted rounded-lg text-sm">{uploadMsg}</div>
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
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      No customers found. Import a CSV to get started.
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
