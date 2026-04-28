import { japanesePrefectures } from "../../../../lib/prefectures.ts";

export default function NewAddressConversionPage() {
  return (
    <main className="converter-shell">
      <section className="converter-card">
      <div className="form-header">
        <div>
          <div className="eyebrow">Japanese address input</div>
          <h1>UPS Latin converter</h1>
        </div>
      </div>

        <form action="/api/address-conversions/create" method="post" className="stripe-form">
          <label className="stripe-field">
            <span>氏名フリガナ</span>
            <input
              name="nameKana"
              autoComplete="off"
              placeholder="下の氏名欄のフリガナをカタカナで入力してください。"
            />
          </label>

          <label className="stripe-field">
            <span>氏名</span>
            <input name="name" autoComplete="name" />
          </label>

          <label className="stripe-field">
            <span>国または地域</span>
            <select name="country" defaultValue="JP">
              <option value="JP">日本</option>
            </select>
          </label>

          <label className="stripe-field">
            <span>郵便番号</span>
            <input name="postalCode" required inputMode="numeric" defaultValue="2770026" />
          </label>

          <label className="stripe-field">
            <span>都道府県</span>
            <select name="state" defaultValue="千葉県">
              {japanesePrefectures.map(([prefectureJa, prefectureEn]) => (
                <option key={prefectureJa} value={prefectureJa}>
                  {prefectureJa} - {prefectureEn}
                </option>
              ))}
            </select>
          </label>

          <label className="stripe-field">
            <span>都市名</span>
            <input name="city" required defaultValue="柏市" />
          </label>

          <label className="stripe-field">
            <span>住所（1 行目）</span>
            <input
              name="addressLine1"
              required
              placeholder="町名・番地（例：神宮前3-1-5）"
              defaultValue="大塚町1-2-3"
            />
          </label>

          <label className="stripe-field">
            <span>住所（2 行目）</span>
            <input
              name="addressLine2"
              placeholder="建物名・部屋番号（該当する方は必須）"
              defaultValue="サクラハイツ 202"
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
