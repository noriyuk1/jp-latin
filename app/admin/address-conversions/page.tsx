import { api, getConvexClient } from "../../../lib/convex-client.ts";

const statuses = ["converted", "needs_review", "approved", "rejected"] as const;

function isStatus(value: string | undefined): value is (typeof statuses)[number] {
  return statuses.some((status) => status === value);
}

export default async function AddressConversionsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const selectedStatus = isStatus(params.status) ? params.status : undefined;
  const convex = getConvexClient();
  const conversions = convex
    ? await convex.query(
        api.addressConversions.list,
        selectedStatus ? { status: selectedStatus } : {}
      )
    : [];

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="eyebrow">Internal shipping operations</div>
          <h1>Address conversions</h1>
        </div>
        <div className="actions inline">
          <a className="button primary link-button" href="/admin/address-conversions/new">
            New conversion
          </a>
          <a className="button link-button" href="/admin/japan-post-csv/import">
            Import CSV
          </a>
          <form action="/api/demo/seed" method="post">
            <button className="button" type="submit">
              Create demo data
            </button>
          </form>
        </div>
      </div>

      {!convex ? (
        <section className="panel stack" style={{ marginBottom: 16 }}>
          <h2>Convex is not configured</h2>
          <div className="muted">
            Set NEXT_PUBLIC_CONVEX_URL to your Convex deployment URL before deploying or testing
            shared review builds.
          </div>
        </section>
      ) : null}

      <nav className="filters" aria-label="Conversion status filters">
        <a className={!selectedStatus ? "filter active" : "filter"} href="/admin/address-conversions">
          All
        </a>
        {statuses.map((status) => (
          <a
            key={status}
            className={selectedStatus === status ? "filter active" : "filter"}
            href={`/admin/address-conversions?status=${status}`}
          >
            {status}
          </a>
        ))}
      </nav>

      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Country</th>
            <th>Postal code</th>
            <th>Address Line 1</th>
            <th>Address Line 2</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {conversions.map((record) => (
            <tr key={record._id}>
              <td>
                <a href={`/admin/address-conversions/${record._id}`}>{record.orderId}</a>
              </td>
              <td>{record.original.country}</td>
              <td>{record.original.postalCode}</td>
              <td>{record.original.addressLine1}</td>
              <td>{record.original.addressLine2}</td>
              <td>
                <span className="status" data-status={record.status}>
                  {record.status}
                </span>
              </td>
              <td>{new Date(record.updatedAt).toLocaleString()}</td>
            </tr>
          ))}
          {conversions.length === 0 ? (
            <tr>
              <td colSpan={7}>No address conversions yet. Create demo data to review the workflow.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
