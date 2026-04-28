function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) || {};
  const value = (key: string, fallback = "") => firstParam(params[key]) || fallback;

  return (
    <main className="converter-shell">
      <section className="converter-card">
        <div className="form-header">
          <div>
            <div className="eyebrow">Japanese address input</div>
            <h1>UPS Latin converter</h1>
          </div>
          <a className="button link-button" href="/admin/address-conversions">
            History
          </a>
        </div>

        <form action="/api/address-conversions/create" method="post" className="stripe-form">
          <label className="stripe-field">
            <span>氏名</span>
            <input name="name" autoComplete="name" defaultValue={value("name")} />
          </label>

          <label className="stripe-field">
            <span>フリガナ</span>
            <input
              name="nameKana"
              autoComplete="off"
              placeholder="ヤマダ タロウ"
              defaultValue={value("nameKana")}
            />
          </label>

          <label className="stripe-field">
            <span>国または地域</span>
            <select name="country" defaultValue="JP">
              <option value="JP">日本</option>
            </select>
          </label>

          <label className="stripe-field">
            <span>郵便番号</span>
            <input
              name="postalCode"
              required
              inputMode="numeric"
              defaultValue={value("postalCode", "2770026")}
            />
          </label>

          <label className="stripe-field">
            <span>都道府県</span>
            <select name="state" defaultValue={value("state", "千葉県")}>
              <option value="千葉県">千葉県 - Chiba</option>
              <option value="東京都">東京都 - Tokyo</option>
            </select>
          </label>

          <label className="stripe-field">
            <span>都市名</span>
            <input name="city" required defaultValue={value("city", "柏市")} />
          </label>

          <label className="stripe-field">
            <span>住所（1 行目）</span>
            <input
              name="addressLine1"
              required
              placeholder="番地"
              defaultValue={value("addressLine1", "大塚町1-2-3")}
            />
          </label>

          <label className="stripe-field">
            <span>住所（2 行目）</span>
            <input
              name="addressLine2"
              placeholder="建物名、部屋番号など（省略可）"
              defaultValue={value("addressLine2", "サクラハイツ 202")}
            />
          </label>

          <input name="orderId" type="hidden" value="" />

          <button className="button primary submit-button" type="submit">
            Convert to UPS Latin
          </button>
        </form>
      </section>
    </main>
  );
}
