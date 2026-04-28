export default async function JapanPostCsvImportPage({
  searchParams
}: {
  searchParams: Promise<{ imported?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="eyebrow">Japan Post romanized CSV</div>
          <h1>Import postal records</h1>
        </div>
        <a className="button link-button" href="/admin/address-conversions">
          Back to list
        </a>
      </div>

      {params.imported ? (
        <section className="panel stack notice" style={{ marginBottom: 16 }}>
          Imported {params.imported} postal records.
        </section>
      ) : null}

      {params.error ? (
        <section className="panel stack notice error" style={{ marginBottom: 16 }}>
          No valid records were found in that CSV.
        </section>
      ) : null}

      <section className="panel stack">
        <form
          action="/api/admin/japan-post-csv/import"
          method="post"
          encType="multipart/form-data"
          className="stack"
        >
          <div className="field">
            <label htmlFor="csvFile">CSV file</label>
            <input id="csvFile" name="csvFile" type="file" accept=".csv,text/csv" />
          </div>

          <div className="field">
            <label htmlFor="csvText">CSV text</label>
            <textarea id="csvText" name="csvText" rows={10} />
          </div>

          <div className="actions">
            <button className="button primary" type="submit">
              Import records
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
