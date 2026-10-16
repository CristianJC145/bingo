import React, { useCallback, useEffect, useState } from "react";
import styled from "styled-components";
import AppButton from "../Buttons/AppButton";

interface Column {
  Header: string;
  accessor?: string;
  HeaderClassName?: string;
  columnClassName?: string;
  truncate?: boolean;
  maxChars?: number;
  Cell?: (props: { value: unknown }) => React.ReactNode;
}

interface DataResult { data: unknown[]; total: number; perPage?: number; }
interface DataService { run: (params?: Record<string, unknown>) => Promise<DataResult>; }
interface AppDataTableProps {
  columns: Column[];
  service: DataService;
  params?: Record<string, unknown>;
  onRowClick?: (row: unknown) => void;
  selectedRowId?: number | null;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

const AppDataTable: React.FC<AppDataTableProps> = ({ columns, service, params, onRowClick, selectedRowId, searchPlaceholder, children }) => {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, perPage: 10, total: 0 });
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await service.run({ ...params, page: pagination.page, perPage: pagination.perPage, search });
      setData(result.data);
      setPagination((current) => ({ ...current, total: result.total }));
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.perPage, params, search, service]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.perPage));
  const firstRecord = data.length === 0 ? 0 : (pagination.page - 1) * pagination.perPage + 1;
  const lastRecord = data.length === 0 ? 0 : firstRecord + data.length - 1;
  const changePage = (page: number) => setPagination((current) => ({ ...current, page: Math.min(totalPages, Math.max(1, page)) }));

  const renderCell = (row: Record<string, unknown>, column: Column) => {
    if (column.accessor) {
      const value = row[column.accessor];
      if (column.truncate && column.maxChars && typeof value === "string" && value.length > column.maxChars) return `${value.slice(0, column.maxChars)}…`;
      return React.isValidElement(value) || ["string", "number"].includes(typeof value) ? value as React.ReactNode : "";
    }
    return column.Cell?.({ value: row }) ?? null;
  };

  return (
    <AppDataTableStyle>
      <div className="table-toolbar">
        <div className="search-group"><div className="search-box"><input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder ?? "Buscar figura…"} /><AppButton icon="search" variant="light" ariaLabel="Buscar" /></div>{children}</div>
        <label className="page-size"><span>Filas</span><select value={pagination.perPage} onChange={(event) => setPagination({ ...pagination, perPage: Number(event.target.value), page: 1 })}>{[10,20,30,40,50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      </div>
      <div className="table-overflow">
        {loading && <div className="loading-bar"><span /></div>}
        <table className="vs-dataTable">
          <thead><tr>{columns.map((column) => <th key={column.Header} className={column.HeaderClassName}>{column.Header}</th>)}</tr></thead>
          <tbody>{data.length === 0 ? <tr><td colSpan={columns.length}><div className="empty-table">{loading ? "Cargando figuras…" : "No se encontraron resultados."}</div></td></tr> : data.map((rawRow, rowIndex) => { const row = rawRow as Record<string, unknown>; return <tr className={selectedRowId === Number(row.id) ? "selected" : ""} key={String(row.id ?? rowIndex)} onClick={() => onRowClick?.(rawRow)}>{columns.map((column, columnIndex) => <td key={`${column.Header}-${columnIndex}`} className={column.columnClassName}>{renderCell(row, column)}</td>)}</tr>; })}</tbody>
        </table>
      </div>
      <div className="table-footer"><span>Mostrando {firstRecord}–{lastRecord} de {pagination.total}</span><div className="pagination"><AppButton onClick={() => changePage(pagination.page - 1)} disabled={pagination.page === 1} icon="angle-left" variant="light" /><strong>{pagination.page} / {totalPages}</strong><AppButton onClick={() => changePage(pagination.page + 1)} disabled={pagination.page === totalPages} icon="angle-right" variant="light" /></div></div>
    </AppDataTableStyle>
  );
};

export default AppDataTable;

const AppDataTableStyle = styled.div`
  .table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .8rem; }
  .search-group { display: flex; flex: 1; align-items: center; gap: .6rem; }
  .search-box { display: flex; width: min(100%, 320px); align-items: center; gap: .25rem; }
  .search-box input { width: 100%; padding: .7rem .8rem; color: var(--text-primary); background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 10px; outline: 0; }
  .search-box input:focus { border-color: rgba(var(--color-primary-rgb),.55); box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb),.1); }
  .page-size { display: flex; align-items: center; gap: .5rem; color: var(--text-muted); font-size: .62rem; }
  .page-size select { padding: .55rem 1.7rem .55rem .65rem; color: var(--text-primary); background: var(--bg-soft); border: 1px solid var(--border-subtle); border-radius: 9px; }
  .table-overflow { position: relative; overflow: auto; }
  .loading-bar { position: absolute; top: 0; left: 0; width: 100%; height: 2px; overflow: hidden; background: rgba(255,255,255,.04); }
  .loading-bar span { display: block; width: 35%; height: 100%; background: var(--color-primary); animation: loading 1s ease-in-out infinite alternate; }
  .empty-table { padding: 2rem; color: var(--text-muted); font-size: .72rem; text-align: center; }
  .table-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: .9rem; color: var(--text-muted); font-size: .62rem; }
  .pagination { display: flex; align-items: center; gap: .5rem; }
  .pagination .vs-btn { width: 32px; min-height: 32px; }
  .pagination strong { min-width: 48px; color: var(--text-secondary); font-size: .62rem; text-align: center; }
  @keyframes loading { to { transform: translateX(185%); } }
  @media (max-width: 620px) { .table-toolbar { align-items: flex-start; flex-direction: column; } .search-group { width: 100%; } .table-footer { align-items: flex-start; flex-direction: column; } }
`;
