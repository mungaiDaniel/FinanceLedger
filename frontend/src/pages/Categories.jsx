import { useCallback, useEffect, useState } from "react";
import { createCategory, createCategoryRule, getCategories, getCategoryRules } from "../api/client";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("expense");
  const [keyword, setKeyword] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [categoryList, ruleList] = await Promise.all([getCategories(), getCategoryRules()]);
    setCategories(categoryList);
    setRules(ruleList);
    if (!ruleCategory && categoryList[0]) setRuleCategory(String(categoryList[0].id));
  }, [ruleCategory]);
  useEffect(() => {
    load().catch(() => setMessage("Couldn't load categories. Check the backend."));
  }, [load]);

  async function addCategory(event) {
    event.preventDefault();
    try {
      await createCategory({ name: categoryName.trim(), type: categoryType });
      setCategoryName("");
      setMessage("Category created.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || "Couldn't create category.");
    }
  }
  async function addRule(event) {
    event.preventDefault();
    try {
      await createCategoryRule({ keyword: keyword.trim(), category_id: Number(ruleCategory) });
      setKeyword("");
      setMessage("Rule created.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || "Couldn't create rule.");
    }
  }

  return (
    <section className="page-section">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Automation</span>
          <h1>Categories &amp; Rules</h1>
          <p>Create categories and use keyword rules to categorize new uploads automatically.</p>
        </div>
      </header>
      {message && <div className="notice-banner">{message}</div>}
      <div className="management-grid">
        <div className="management-card">
          <h2>Add category</h2>
          <form onSubmit={addCategory} className="stack-form">
            <input
              className="text-input"
              required
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="e.g. Health"
            />
            <select value={categoryType} onChange={(event) => setCategoryType(event.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <button className="primary-button">Create category</button>
          </form>
        </div>
        <div className="management-card">
          <h2>Add keyword rule</h2>
          <form onSubmit={addRule} className="stack-form">
            <input
              className="text-input"
              required
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="e.g. PHARMACY"
            />
            <select required value={ruleCategory} onChange={(event) => setRuleCategory(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="primary-button">Create rule</button>
          </form>
        </div>
      </div>
      <div className="list-grid">
        <div className="management-card">
          <h2>Categories</h2>
          <div className="tag-list">
            {categories.map((category) => (
              <span key={category.id} className={`category-tag ${category.type}`}>
                {category.name}
                <small>{category.type}</small>
              </span>
            ))}
          </div>
        </div>
        <div className="management-card">
          <h2>Keyword rules</h2>
          <ul className="rule-list">
            {rules.map((rule) => (
              <li key={rule.id}>
                <code>{rule.keyword}</code>
                <span>→ {rule.category_name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
