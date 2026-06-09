import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [usersState, setUsersState] = useState({
    loading: true,
    error: '',
    columns: [],
    rows: [],
  })

  useEffect(() => {
    const controller = new AbortController()

    async function loadUsers() {
      try {
        const response = await fetch('/api/app/users', {
          signal: controller.signal,
        })
        const payload = await readJsonResponse(response)

        if (!response.ok) {
          throw new Error(payload.message || 'Failed to load users.')
        }

        setUsersState({
          loading: false,
          error: '',
          columns: payload.columns || [],
          rows: payload.rows || [],
        })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }

        setUsersState({
          loading: false,
          error: error.message || 'Failed to load users.',
          columns: [],
          rows: [],
        })
      }
    }

    loadUsers()
    return () => controller.abort()
  }, [])

  const { loading, error, columns, rows } = usersState

  return (
    <main className="page">
      <header className="header">
        <p className="kicker">Wearable Frontend</p>
        <h1>Users Table</h1>
      </header>

      {loading ? <p className="notice">Loading users...</p> : null}
      {error ? <p className="notice error">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <p className="notice">Users table is connected, but there are no rows to show.</p>
      ) : null}

      {!loading && !error && columns.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={`${index}-${column}`}>{formatCellValue(row[column])}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="empty-row">
                    No users are stored in the table yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  )
}

function formatCellValue(value) {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

async function readJsonResponse(response) {
  const raw = await response.text()

  if (!raw.trim()) {
    throw new Error('The backend returned an empty response.')
  }

  try {
    return JSON.parse(raw)
  } catch {
    const snippet = raw.replace(/\s+/g, ' ').trim().slice(0, 120)
    throw new Error(`Expected JSON from backend, but received: ${snippet}`)
  }
}

export default App
