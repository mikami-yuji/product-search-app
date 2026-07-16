/**
 * @typedef {Object} Product
 * @property {string} 受注№ - Order Number
 * @property {string} 商品コード - Product Code
 * @property {string} タイトル - Title
 * @property {string} 商品名 - Product Name
 * @property {string} 種別 - Product Type (e.g. 既製品, 別注品)
 * @property {string} 重量 - Weight
 * @property {string} 材質名称 - Material Name
 * @property {string} 総色数 - Total Colors Count
 * @property {string} 直送先名称 - Direct Destination Name
 * @property {string} [形状] - Shape
 * @property {string} [JANコード] - JAN Code
 * @property {string|number} [単価] - Unit Price
 * @property {string|number} [印刷代] - Printing Cost
 * @property {string} [最新受注日] - Latest Order Date
 * @property {string|number} [受注数] - Order Quantity
 * @property {string} [表色数] - Front Colors Count
 * @property {string} [裏色数] - Back Colors Count
 */

/**
 * @typedef {Object} FiltersState
 * @property {string[]} 種別
 * @property {string[]} 重量
 * @property {string[]} 材質名称
 * @property {string[]} 総色数
 * @property {string[]} 直送先名称
 */

/**
 * @typedef {'all' | 'title' | 'code'} SearchScope
 */

/**
 * @typedef {Object} UniqueValues
 * @property {string[]} 種別
 * @property {string[]} 重量
 * @property {string[]} 材質名称
 * @property {string[]} 総色数
 * @property {string[]} 直送先名称
 */

/**
 * @typedef {Object.<string, Object.<string, number>>} FacetCounts
 */
export {};
