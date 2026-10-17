import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { PageHeader, EmptyState } from '../components/ui.jsx';
import { money } from '../lib/format.js';

export function ReturnRecords({ rows, products, onReviewProduct }) {
  const [search, setSearch] = useState('');
  const [productId, setProductId] = useState('all');
  const [reason, setReason] = useState('all');
  const reasons = [...new Set(rows.map((row) => row.reason))].sort();
  const visible = rows.filter(
    (row) =>
      (productId === 'all' || row.productId === productId) &&
      (reason === 'all' || row.reason === reason) &&
      `${row.id} ${row.returnId} ${row.batchId} ${row.courier} ${row.productName}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <PageHeader label="SOURCE DATA" title="Return records">
        Inspect the orders behind each finding. This workspace uses synthetic commerce data.
      </PageHeader>
      <section className="panel">
        <div className="records-toolbar">
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search return records"
              placeholder="Order, return, batch, courier…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by product</span>
            <select
              aria-label="Filter by product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="all">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by return reason</span>
            <select
              aria-label="Filter by return reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option value="all">All return reasons</option>
              {reasons.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Return / order</th>
                <th>Product</th>
                <th>Reason</th>
                <th>Batch</th>
                <th>Courier</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.returnId}>
                  <td>
                    <strong className="mono">{row.returnId}</strong>
                    <small className="mono">{row.id}</small>
                  </td>
                  <td>
                    <button className="finding-link" onClick={() => onReviewProduct(row.productId)}>
                      {row.productName}
                      <small>Review product →</small>
                    </button>
                  </td>
                  <td>{row.reason}</td>
                  <td className="mono">{row.batchId}</td>
                  <td>{row.courier}</td>
                  <td className="tabular">{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visible.length && (
          <EmptyState title="No matching returns">
            Try a different product, return reason, or record ID.
          </EmptyState>
        )}
        <p className="table-note">
          Showing {visible.length} of {rows.length} current-cohort returns. Gross order values are
          in USD.
        </p>
      </section>
    </>
  );
}
