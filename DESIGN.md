---
name: "得意先別商品検索ツール Design System"
version: "1.0.0"
description: "コーポレートスタイルと高視認性を兼ね備えたB2B得意先別商品検索ツールのデザインシステム"
colors:
  primary: "#2B4C7E"
  primary-hover: "#1E365C"
  dark: "#1E293B"
  light: "#334155"
  accent-blue: "#4B6A9B"
  background: "#F1F5F9"
  surface: "#FFFFFF"
  border: "#E2E8F0"
  text: "#1E293B"
  text-light: "#64748B"
  badge-ready: "#059669"
  badge-custom: "#D97706"
typography:
  h1:
    fontFamily: "'Amazon Ember', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: "700"
  h2:
    fontFamily: "'Amazon Ember', Arial, sans-serif"
    fontSize: "1.1rem"
    fontWeight: "600"
  body-md:
    fontFamily: "'Amazon Ember', Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.5"
  subtext:
    fontFamily: "'Amazon Ember', Arial, sans-serif"
    fontSize: "0.875rem"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  header:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.surface}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1rem"
  button-primary-hover:
    backgroundColor: "#F08804"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1rem 0.75rem 3rem"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
---

## Overview
Corporate-Style Business UI — B2B向け得意先別商品検索ツールにおける視認性と操作性を最優先したビジネスUIデザインシステム。
落ち着きのあるスレートインディゴとダークチャコールを基調とし、長時間の業務でも疲れにくいシックで洗練されたインターフェースを提供します。

## Colors
基本カラーパレットはビジネス用途に合わせた落ち着いたブルーグレー階層で構成されています。
- **Primary (#2B4C7E):** スレートインディゴ。主要なアクションボタンやハイライトに使用。
- **Dark (#1E293B):** ダークチャコール。ヘッダーや主要なコンテキスト領域の背景。
- **Background (#F1F5F9):** 柔らかいペールスチール。純白よりも目に優しい背景色。
- **Text (#1E293B):** 高コントラストかつ柔らかいダークグレー。
- **Text Light (#64748B):** サブテキストや補足情報用のミディアムスレート。

## Typography
フォントは可読性の高いサンセリフ系 (`'Amazon Ember', Arial, sans-serif`) をベースに、明確なサイズ階層を設定しています。

## Component Rules
- **Buttons:** ホバー時には滑らかなイージングアニメーション (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) と微妙なY軸移動・シャドウを適用。
- **Modals & Cards:** 8pxの角丸 (`rounded.md`) と柔らかいドロップシャドウを適用して立体感を表現。
- **Badges:** ステータス表示には落ち着いたトーンのグリーン (`#059669`) およびアンバー (`#D97706`) を使用。
