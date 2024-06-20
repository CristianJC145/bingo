import React, { useEffect, useState } from "react";
import styled from "styled-components";
import AppButton from "../Buttons/AppButton";
import { services } from "../../constant/services";

interface Column {
  Header: string;
  accessor?: string;
  HeaderClassName?: string;
  columnClassName?: string;
  truncate?: boolean;
  maxChars?: number;
  Cell?: (props: { value: any }) => React.ReactNode;
}

interface AppDataTableProps {
  columns: Column[];
  service: any;
  params?: {
    id: number;
  };
}

const AppDataTable: React.FC<AppDataTableProps> = ({
  columns,
  service,
  params,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 10,
    total: 0,
  });
  const pageIndex = pagination.page - 1;
  const pageSize = 10;

  const [search, setSearch] = useState("");
  const firstRecord = data.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRecord = data.length === 0 ? 0 : firstRecord - 1 + data.length;

  const totalPages = Math.ceil(pagination.total / pagination.perPage);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await service.run({
        ...params,
        page: pagination.page,
        perPage: pagination.perPage,
        search,
      });

      const { data, page, perPage, total } = result;
      let products = data;
      products.map((product: any) => {
        product.images = product.images
          .split(",")
          .map((image: string) => `${services.api_url}/${image}`);

        return {
          ...products,
        };
      });
      setData(data);
      setPagination((prevPagination) => ({
        ...prevPagination,
        total: result.total,
      }));
    } catch (error) {
      console.error("Error al obtener datos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.perPage, search, service]);

  const handlePageChange = (newPageIndex: number) => {
    if (pagination.page !== newPageIndex) {
      setPagination((prevPagination) => ({
        ...prevPagination,
        page: newPageIndex,
      }));
    }
  };

  return (
    <AppDataTableStyle>
      <div className="d-flex align-items-center justify-content-between gap-md-4">
        <section className="vs-section-search-bar px-0">
          <div className="vs-search-bar py-0 shadow-sm col-12 col-sm-6 col-xl-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
            />
            <AppButton
              icon="search"
              variant="dark"
              className="cursor-pointer"
            ></AppButton>
          </div>
        </section>
        <div
          className="d-flex gap-2 text-nowrap align-items-center"
          style={{ color: "var(--color-gray-300)" }}
        >
          <span className="d-none d-md-block">Filas por Página</span>
          <select
            value={pagination.perPage}
            onChange={(e) =>
              setPagination({
                ...pagination,
                perPage: Number(e.target.value),
                page: 1,
              })
            }
            className="form-select ms-4 ms-lg-0 me-1 me-sm-0"
            style={{ padding: "0.675rem var(--p-8) 0.675rem var(--p-4)" }}
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="vs-dataTable">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.Header} className={column.HeaderClassName}>
                  {column.Header}
                </th>
              ))}
            </tr>
          </thead>
          {data.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={6}>
                  <h3 className="text-center">No se encontraron resultados.</h3>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td
                      key={colIndex}
                      className={column.columnClassName}
                      width="200"
                    >
                      {column.accessor
                        ? column.truncate && column.maxChars
                          ? row[column.accessor].length > column.maxChars
                            ? `${row[column.accessor].slice(
                                0,
                                column.maxChars
                              )}...`
                            : row[column.accessor]
                          : row[column.accessor]
                        : column.Cell
                        ? column.Cell({ value: row })
                        : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
      <div className="d-flex align-items-center justify-content-between flex-column flex-md-row gap-3 mt-3">
        <div className="d-flex align-items-center gap-1 gap-sm-3">
          <AppButton
            onClick={() => handlePageChange(1)}
            disabled={pagination.page === 1}
            icon={"angle-double-left"}
            variant="dark"
          ></AppButton>
          <AppButton
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            icon={"angle-left"}
            variant="dark"
          ></AppButton>
          <div className="d-flex gap-2 gap-sm-4">
            {pages.map((page, index) => (
              <AppButton
                key={index}
                onClick={() => handlePageChange(page)}
                disabled={pagination.page === page}
                label={`${index + 1}`}
                className={`py-2 px-3 ${
                  pagination.page === page ? "text-white" : "text-dark"
                }`}
                variant={pagination.page === page ? "primary" : "white"}
              ></AppButton>
            ))}
          </div>
          <AppButton
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === totalPages}
            icon={"angle-right"}
            variant="dark"
          ></AppButton>
          <AppButton
            onClick={() => handlePageChange(totalPages)}
            disabled={pagination.page === totalPages}
            icon={"angle-double-right"}
            variant="dark"
          ></AppButton>
        </div>

        <span style={{ color: "var(--color-gray-300)" }}>
          Mostrando {firstRecord} a {lastRecord} de {pagination.total} registros
        </span>
      </div>
    </AppDataTableStyle>
  );
};
export default AppDataTable;

const AppDataTableStyle = styled.div`
  .vs-section-search-bar {
    display: flex;
    flex: 1 1 auto;
    justify-content: space-between;
    align-items: center;
    padding: var(--p-2) var(--p-4);
    color: #fff;
    background-color: transparent;
  }
  .vs-search-bar {
    display: flex;
    align-items: center;
    background-color: #fff;
    padding: var(--p-1) var(--p-3);
    border-radius: 6px;
  }
  .vs-search-bar input[type="text"] {
    padding: 0 var(--p-3);
    border: none;
    flex-grow: 1;
    width: 100%;
    background-color: transparent;
    color: rgb(110, 110, 110);
  }
  .vs-search-bar input[type="text"]:focus-visible {
    outline: none;
  }
`;
