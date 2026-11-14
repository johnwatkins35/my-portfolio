"""Build the Harborline Excel dashboard.

Harborline is fictional. The workbook is a practice lab: a bookings table,
PivotTables, slicers, and a Dashboard sheet that follows those slicers.
"""

from __future__ import annotations

import json
import random
from datetime import date, datetime
from pathlib import Path

import win32com.client

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "harborline-dashboard.xlsx"

MONTHS = [
    (2025, m) for m in range(1, 11)
] + [
    (2026, m) for m in range(1, 11)
]
MONTH_NAME = {
    1: "Jan",
    2: "Feb",
    3: "Mar",
    4: "Apr",
    5: "May",
    6: "Jun",
    7: "Jul",
    8: "Aug",
    9: "Sep",
    10: "Oct",
    11: "Nov",
    12: "Dec",
}
REGIONS = {
    "West": ("Pacific North", "Pacific South"),
    "Northeast": ("Mid-Atlantic", "New England"),
    "Central": ("Great Lakes", "Plains"),
    "South": ("Gulf", "Southeast"),
    "Mountain": ("Rockies", "Desert"),
}
REGION_SHARE = {
    "West": 0.28,
    "Northeast": 0.23,
    "Central": 0.19,
    "South": 0.17,
    "Mountain": 0.13,
}
PRODUCTS = (
    "Cloud Seats",
    "Support Plans",
    "Security Add-ons",
    "Hardware Refresh",
    "Training",
)
BASE = {
    "Cloud Seats": 640_000,
    "Support Plans": 470_000,
    "Security Add-ons": 105_000,
    "Hardware Refresh": 410_000,
    "Training": 90_000,
}
GROWTH = {
    "Cloud Seats": 0.015,
    "Support Plans": 0.002,
    "Security Add-ons": 0.030,
    "Hardware Refresh": -0.016,
    "Training": 0.004,
}
SEATS_PER_10K = {
    "Cloud Seats": 16,
    "Support Plans": 5,
    "Security Add-ons": 9,
    "Hardware Refresh": 2.4,
    "Training": 12,
}
TRAINING_SEASON = {
    1: 0.72,
    2: 0.84,
    3: 2.15,
    4: 1.12,
    5: 0.78,
    6: 0.68,
    7: 0.62,
    8: 0.88,
    9: 1.95,
    10: 1.08,
}
SEGMENTS = (("Renewal", 0.52), ("Expansion", 0.33), ("New", 0.15))
HEADERS = (
    "OrderID",
    "OrderDate",
    "Year",
    "Quarter",
    "Month",
    "Region",
    "Territory",
    "ProductLine",
    "Segment",
    "Status",
    "Quote",
    "Revenue",
    "Seats",
    "WonFlag",
    "ClosedFlag",
)

XL_SUM = -4157
XL_COUNT = -4112
XL_ROW = 1
XL_COLUMN = 2
XL_DESCENDING = 2
XL_LINE = 4
XL_COLUMN_STACKED = 52
XL_BAR = 57
XL_EDGE = (7, 8, 9, 10)
XL_CALC_AUTO = -4105
XL_OPENXML = 51
XL_REPEAT = 2
XL_TABULAR = 1
XL_EXPRESSION = 2
XL_LEGEND_BOTTOM = -4107
XL_VALUE_AXIS = 2
XL_CATEGORY_AXIS = 1
XL_MAXIMUM = 2


def rgb(red: int, green: int, blue: int) -> int:
    return red + green * 256 + blue * 65536


NAVY = rgb(27, 54, 93)
TEAL = rgb(14, 116, 144)
GOLD = rgb(168, 132, 48)
INK = rgb(27, 54, 93)
SLATE = rgb(92, 107, 130)
PAPER = rgb(244, 247, 251)
LINE = rgb(214, 222, 232)
WHITE = rgb(255, 255, 255)
GREEN = rgb(15, 118, 110)
RED = rgb(185, 28, 28)
ORANGE = rgb(180, 83, 9)
PURPLE = rgb(91, 33, 182)

SERIES_COLOR = {
    "Cloud Seats": NAVY,
    "Support Plans": TEAL,
    "Security Add-ons": GOLD,
    "Hardware Refresh": ORANGE,
    "Training": PURPLE,
}


def month_label(year: int, month: int) -> str:
    return f"{MONTH_NAME[month]} {year}"


def quarter(month: int) -> str:
    return f"Q{(month - 1) // 3 + 1}"


def mix_multiplier(region: str, product: str) -> float:
    if region == "Mountain" and product == "Hardware Refresh":
        return 1.9
    if region == "Mountain" and product == "Cloud Seats":
        return 0.62
    if region == "West" and product == "Cloud Seats":
        return 1.22
    if region == "Northeast" and product == "Security Add-ons":
        return 1.4
    if region == "South" and product == "Support Plans":
        return 1.15
    return 1.0


def lost_count(region: str, year: int, product: str, month: int) -> int:
    if region == "South" and year == 2026:
        return 3
    if product == "Security Add-ons":
        return 1 if month % 2 == 0 else 0
    if product == "Hardware Refresh":
        return 2
    return 1


def generate_rows() -> list[dict]:
    rng = random.Random(35)
    rows: list[dict] = []
    order_id = 24001
    for year, month in MONTHS:
        elapsed = (year - 2025) * 12 + (month - 1)
        for region, territories in REGIONS.items():
            for product in PRODUCTS:
                national = BASE[product] * ((1 + GROWTH[product]) ** elapsed)
                if product == "Training":
                    national *= TRAINING_SEASON[month]
                regional = (
                    national
                    * REGION_SHARE[region]
                    * mix_multiplier(region, product)
                    * rng.uniform(0.97, 1.03)
                )
                split = rng.uniform(0.47, 0.53)
                territory_amounts = (
                    (territories[0], regional * split),
                    (territories[1], regional * (1 - split)),
                )
                won_quotes: list[tuple[str, str, float]] = []
                for territory, amount in territory_amounts:
                    for segment, weight in SEGMENTS:
                        quote = amount * weight
                        won_quotes.append((territory, segment, quote))
                        rows.append(
                            deal(
                                order_id,
                                year,
                                month,
                                region,
                                territory,
                                product,
                                segment,
                                "Won",
                                quote,
                            )
                        )
                        order_id += 1
                losses = lost_count(region, year, product, month)
                for index in range(losses):
                    territory, segment, quote = won_quotes[index % len(won_quotes)]
                    rows.append(
                        deal(
                            order_id,
                            year,
                            month,
                            region,
                            territory,
                            product,
                            segment,
                            "Lost",
                            quote * rng.uniform(0.85, 1.1),
                        )
                    )
                    order_id += 1
                if year == 2026 and month == 10:
                    rows.append(
                        deal(
                            order_id,
                            year,
                            month,
                            region,
                            territories[0],
                            product,
                            "New",
                            "Open",
                            won_quotes[0][2] * rng.uniform(0.9, 1.15),
                        )
                    )
                    order_id += 1
    return rows


def deal(
    order_id: int,
    year: int,
    month: int,
    region: str,
    territory: str,
    product: str,
    segment: str,
    status: str,
    quote: float,
) -> dict:
    won = status == "Won"
    closed = status in ("Won", "Lost")
    revenue = round(quote, 2) if won else 0
    seats = int(round(revenue / 10000 * SEATS_PER_10K[product])) if won else 0
    return {
        "OrderID": f"HL-{order_id}",
        "OrderDate": date(year, month, 8 if segment == "New" else 15 if segment == "Expansion" else 22),
        "Year": year,
        "Quarter": quarter(month),
        "Month": month_label(year, month),
        "Region": region,
        "Territory": territory,
        "ProductLine": product,
        "Segment": segment,
        "Status": status,
        "Quote": round(quote, 2),
        "Revenue": revenue,
        "Seats": seats,
        "WonFlag": 1 if won else 0,
        "ClosedFlag": 1 if closed else 0,
    }


def money(value: float) -> str:
    value = float(value)
    sign = "-" if value < 0 else ""
    amount = abs(value)
    if amount >= 1_000_000:
        return f"{sign}${amount / 1_000_000:.1f} million"
    if amount >= 10_000:
        return f"{sign}${amount / 1000:.0f} thousand"
    return f"{sign}${amount:,.0f}"


def percent(value: float) -> str:
    return f"{value * 100:.1f} percent"


def signed_percent(value: float) -> str:
    return f"{value * 100:+.1f} percent"


def points(value: float) -> str:
    return f"{value * 100:+.1f} points"


def require_story(rows: list[dict]) -> None:
    def won(year: int, **filters) -> float:
        total = 0.0
        for row in rows:
            if row["Year"] != year or row["Status"] != "Won":
                continue
            if any(row[key] != value for key, value in filters.items()):
                continue
            total += row["Revenue"]
        return total

    company = won(2026) / won(2025) - 1
    hardware = won(2026, ProductLine="Hardware Refresh") / won(2025, ProductLine="Hardware Refresh") - 1
    security = won(2026, ProductLine="Security Add-ons") / won(2025, ProductLine="Security Add-ons") - 1
    cloud = won(2026, ProductLine="Cloud Seats") / won(2025, ProductLine="Cloud Seats") - 1
    mountain = won(2026, Region="Mountain") / won(2025, Region="Mountain") - 1
    march = won(2026, Month="Mar 2026", ProductLine="Training")
    february = won(2026, Month="Feb 2026", ProductLine="Training")

    def rate(year: int, **filters) -> float:
        won_deals = closed = 0
        for row in rows:
            if row["Year"] != year:
                continue
            if any(row[key] != value for key, value in filters.items()):
                continue
            won_deals += row["WonFlag"]
            closed += row["ClosedFlag"]
        return won_deals / closed

    south_drop = rate(2025, Region="South") - rate(2026, Region="South")
    checks = {
        "company_yoy": company,
        "hardware_yoy": hardware,
        "security_yoy": security,
        "cloud_yoy": cloud,
        "mountain_yoy": mountain,
        "training_march_vs_feb": march / february,
        "south_conversion_drop": south_drop,
    }
    print(json.dumps(checks, indent=2))
    if not (0.04 <= company <= 0.22):
        raise SystemExit("Company growth is outside the story range.")
    if hardware > -0.08:
        raise SystemExit("Hardware is not declining enough.")
    if security < 0.25:
        raise SystemExit("Security growth is too small.")
    if cloud < 0.08:
        raise SystemExit("Cloud growth is too small.")
    if mountain > company - 0.04:
        raise SystemExit("Mountain is not lagging the company.")
    if march < february * 1.5:
        raise SystemExit("Training seasonality is too flat.")
    if south_drop < 0.1:
        raise SystemExit("South conversion does not drop enough.")


def excel_value(value):
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    return value


def rows_to_matrix(rows: list[dict]) -> tuple[tuple, ...]:
    matrix = [HEADERS]
    for row in rows:
        matrix.append(tuple(excel_value(row[name]) for name in HEADERS))
    return tuple(matrix)


def add_value(pivot, source: str, caption: str, function: int, number_format: str | None = None):
    field = pivot.AddDataField(pivot.PivotFields(source), caption, function)
    if number_format:
        field.NumberFormat = number_format
    return field


def hide_subtotals(pivot, field_name: str) -> None:
    field = pivot.PivotFields(field_name)
    field.Subtotals = (False,) * 12


def style_pivot(pivot) -> None:
    pivot.RowAxisLayout(XL_TABULAR)
    pivot.RepeatAllLabels(XL_REPEAT)
    pivot.ShowTableStyleRowStripes = True
    pivot.TableStyle2 = "PivotStyleMedium2"
    pivot.RowGrand = False
    pivot.ColumnGrand = False


def chart_colors(chart, kind: str) -> None:
    series_count = chart.SeriesCollection().Count
    for index in range(series_count, 0, -1):
        series = chart.SeriesCollection(index)
        name = str(series.Name)
        if "Grand Total" in name:
            series.Delete()
            continue
        color = SERIES_COLOR.get(name, NAVY)
        if kind == "line":
            series.Format.Line.ForeColor.RGB = color
            series.Format.Line.Weight = 2.25
            series.MarkerStyle = 8
            series.MarkerSize = 5
            series.MarkerForegroundColor = color
            series.MarkerBackgroundColor = color
        else:
            series.Format.Fill.ForeColor.RGB = color
            series.Format.Line.ForeColor.RGB = color


def polish_chart(chart, title: str, kind: str) -> None:
    chart.HasTitle = True
    chart.ChartTitle.Text = title
    chart.ChartTitle.Font.Name = "Calibri"
    chart.ChartTitle.Font.Size = 14
    chart.ChartTitle.Font.Bold = True
    chart.ChartTitle.Font.Color = NAVY
    chart.HasLegend = kind != "bar"
    if chart.HasLegend:
        chart.Legend.Position = XL_LEGEND_BOTTOM
        chart.Legend.Font.Name = "Calibri"
        chart.Legend.Font.Size = 9
    chart.ChartArea.Format.Fill.ForeColor.RGB = WHITE
    chart.ChartArea.Format.Line.ForeColor.RGB = LINE
    chart.PlotArea.Format.Fill.ForeColor.RGB = WHITE
    chart.ShowAllFieldButtons = False
    axis = chart.Axes(XL_VALUE_AXIS)
    axis.TickLabels.NumberFormat = "$#,##0"
    axis.TickLabels.Font.Name = "Calibri"
    axis.TickLabels.Font.Size = 9
    axis.HasMajorGridlines = True
    chart.Axes(XL_CATEGORY_AXIS).TickLabels.Font.Name = "Calibri"
    chart.Axes(XL_CATEGORY_AXIS).TickLabels.Font.Size = 9
    chart_colors(chart, kind)


def add_slicer(workbook, sheet, pivot, field: str, name: str, caption: str, left: float, top: float, width: float, height: float):
    cache = workbook.SlicerCaches.Add2(pivot, field)
    slicer = cache.Slicers.Add(SlicerDestination=sheet, Name=name, Caption=caption)
    slicer.Caption = caption
    slicer.Left = left
    slicer.Top = top
    slicer.Width = width
    slicer.Height = height
    return cache


def collection_items(collection):
    try:
        count = collection.Count
    except Exception:
        collection = collection()
        count = collection.Count
    for index in range(1, count + 1):
        yield collection.Item(index)


def connect(cache, pivots, skip: str | None = None) -> None:
    connected = {pivot.Name for pivot in collection_items(cache.PivotTables)}
    for pivot in pivots:
        if pivot.Name == skip or pivot.Name in connected:
            continue
        cache.PivotTables.AddPivotTable(pivot)


def disconnect(cache, name: str) -> None:
    for pivot in list(collection_items(cache.PivotTables)):
        if pivot.Name == name:
            cache.PivotTables.RemovePivotTable(pivot)


def select_only(cache, names: set[str]) -> None:
    wanted = {str(name) for name in names}
    items = list(collection_items(cache.SlicerItems))
    # A slicer cannot have every item cleared, so select a keeper before dropping the rest.
    for item in items:
        if slicer_name(item) in wanted and not item.Selected:
            item.Selected = True
    for item in items:
        if slicer_name(item) not in wanted and item.Selected:
            item.Selected = False


def slicer_name(item) -> str:
    name = str(item.Name)
    if name.endswith(".0"):
        return name[:-2]
    return name


def clear_slicer(cache) -> None:
    cache.ClearManualFilter()


def card_border(rng) -> None:
    rng.Interior.Color = PAPER
    for edge in XL_EDGE:
        border = rng.Borders(edge)
        border.LineStyle = 1
        border.Color = LINE
        border.Weight = 2


def build() -> None:
    rows = generate_rows()
    require_story(rows)
    matrix = rows_to_matrix(rows)
    print(f"rows {len(rows)}")

    excel = win32com.client.DispatchEx("Excel.Application")
    workbook = None
    try:
        excel.Visible = False
        excel.DisplayAlerts = False
        excel.ScreenUpdating = False
        workbook = excel.Workbooks.Add()
        excel.Calculation = XL_CALC_AUTO
        names = ("Dashboard", "Walkthrough", "Data", "Calc", "KPI", "YoY", "Trend", "Rank", "Mix")
        while workbook.Worksheets.Count < len(names):
            workbook.Worksheets.Add(After=workbook.Worksheets(workbook.Worksheets.Count))
        sheets = {}
        for index, name in enumerate(names, start=1):
            sheet = workbook.Worksheets(index)
            sheet.Name = name
            sheets[name] = sheet
        dashboard = sheets["Dashboard"]
        walkthrough = sheets["Walkthrough"]
        data = sheets["Data"]
        calc = sheets["Calc"]

        last_row = len(matrix)
        last_col = len(HEADERS)
        data.Range(data.Cells(1, 1), data.Cells(last_row, last_col)).Value = matrix
        data.Columns("B").NumberFormat = "yyyy-mm-dd"
        data.Columns("K").NumberFormat = "$#,##0"
        data.Columns("L").NumberFormat = "$#,##0"
        data.Columns("M").NumberFormat = "#,##0"
        table = data.ListObjects.Add(1, data.Range(data.Cells(1, 1), data.Cells(last_row, last_col)), None, 1)
        table.Name = "Bookings"
        table.TableStyle = "TableStyleMedium2"
        data.Columns("A:O").AutoFit()
        data.Activate()
        data.Range("A2").Select()
        workbook.Windows(1).FreezePanes = True
        data.Tab.Color = TEAL

        source = f"'Data'!{table.Range.Address}"
        cache = workbook.PivotCaches().Create(1, source)
        kpi = cache.CreatePivotTable("'KPI'!R4C2", "KPI")
        yoy = cache.CreatePivotTable("'YoY'!R4C2", "YoY")
        trend = cache.CreatePivotTable("'Trend'!R4C2", "Trend")
        rank = cache.CreatePivotTable("'Rank'!R4C2", "Rank")
        mix = cache.CreatePivotTable("'Mix'!R4C2", "Mix")
        detail = cache.CreatePivotTable("'Dashboard'!R54C2", "Detail")

        kpi.PivotFields("Year").Orientation = XL_ROW
        kpi.PivotFields("Year").NumberFormat = "0"
        add_value(kpi, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        add_value(kpi, "Seats", "Active seats", XL_SUM, "#,##0")
        add_value(kpi, "WonFlag", "Won deals", XL_SUM, "#,##0")
        add_value(kpi, "ClosedFlag", "Closed deals", XL_SUM, "#,##0")
        kpi.RowGrand = True
        kpi.ColumnGrand = False
        kpi.TableStyle2 = "PivotStyleMedium2"

        yoy.PivotFields("Year").Orientation = XL_COLUMN
        yoy.PivotFields("Year").NumberFormat = "0"
        add_value(yoy, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        add_value(yoy, "Seats", "Active seats", XL_SUM, "#,##0")
        add_value(yoy, "WonFlag", "Won deals", XL_SUM, "#,##0")
        add_value(yoy, "ClosedFlag", "Closed deals", XL_SUM, "#,##0")
        yoy.RowGrand = False
        yoy.ColumnGrand = False
        yoy.TableStyle2 = "PivotStyleMedium2"

        trend.PivotFields("Month").Orientation = XL_ROW
        trend.PivotFields("Month").NumberFormat = "mmm yyyy"
        trend.PivotFields("ProductLine").Orientation = XL_COLUMN
        add_value(trend, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        style_pivot(trend)
        order_months(trend)

        rank.PivotFields("Territory").Orientation = XL_ROW
        add_value(rank, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        style_pivot(rank)
        # Bar charts draw the first category at the bottom, so ascending order puts the largest territory on top.
        rank.PivotFields("Territory").AutoSort(1, "Won revenue")

        mix.PivotFields("Region").Orientation = XL_ROW
        mix.PivotFields("ProductLine").Orientation = XL_COLUMN
        add_value(mix, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        style_pivot(mix)
        mix.PivotFields("Region").AutoSort(XL_DESCENDING, "Won revenue")
        order_products(mix)

        for field_name, caption in (
            ("Region", "Region"),
            ("ProductLine", "Product line"),
            ("Segment", "Segment"),
            ("Status", "Status"),
        ):
            field = detail.PivotFields(field_name)
            field.Orientation = XL_ROW
            hide_subtotals(detail, field_name)
            field.Caption = caption
        add_value(detail, "Revenue", "Won revenue", XL_SUM, '"$"#,##0')
        add_value(detail, "Seats", "Active seats", XL_SUM, "#,##0")
        add_value(detail, "OrderID", "Deals", XL_COUNT, "#,##0")
        add_value(detail, "WonFlag", "Won deals", XL_SUM, "#,##0")
        style_pivot(detail)
        detail.RowGrand = True
        detail.TableStyle2 = "PivotStyleMedium2"

        cache.Refresh()
        order_months(trend)
        order_products(mix)
        order_products(trend)

        write_formulas(calc)
        layout_dashboard(dashboard)
        top = dashboard.Cells(9, 2).Top
        left = dashboard.Cells(9, 2).Left
        width = 126
        height = 136
        gap = 8
        year_cache = add_slicer(workbook, dashboard, kpi, "Year", "YearSlicer", "Year", left, top, width, height)
        quarter_cache = add_slicer(
            workbook, dashboard, kpi, "Quarter", "QuarterSlicer", "Quarter", left + (width + gap), top, width, height
        )
        region_cache = add_slicer(
            workbook, dashboard, kpi, "Region", "RegionSlicer", "Region", left + 2 * (width + gap), top, width, height
        )
        product_cache = add_slicer(
            workbook,
            dashboard,
            kpi,
            "ProductLine",
            "ProductSlicer",
            "Product line",
            left + 3 * (width + gap),
            top,
            width,
            height,
        )
        status_cache = add_slicer(
            workbook, dashboard, kpi, "Status", "StatusSlicer", "Status", left + 4 * (width + gap), top, width, height
        )

        linked = (kpi, trend, rank, mix, detail)
        all_pivots = (kpi, yoy, trend, rank, mix, detail)
        for slicer_cache in (quarter_cache, region_cache, product_cache, status_cache):
            connect(slicer_cache, all_pivots)
        connect(year_cache, linked)
        disconnect(year_cache, "YoY")

        select_only(year_cache, {"2026"})
        excel.Calculate()

        place_charts(dashboard, trend, rank, mix)
        color_scale(detail)
        stats = measure(
            excel,
            dashboard,
            calc,
            trend,
            rank,
            year_cache,
            quarter_cache,
            region_cache,
            product_cache,
            status_cache,
        )
        write_walkthrough(walkthrough)
        fill_walkthrough_numbers(walkthrough, stats)
        select_only(year_cache, {"2026"})
        for slicer_cache in (quarter_cache, region_cache, product_cache, status_cache):
            clear_slicer(slicer_cache)
        excel.Calculate()

        calc.Range("A1").Value = (
            "Card math for the Dashboard. KPI and YoY are hidden sheets. "
            "The Year slicer does not filter YoY, so growth can compare the selected year with the year before. "
            "Right-click a sheet tab and choose Unhide to open KPI, YoY, Trend, Rank, or Mix."
        )
        calc.Range("A1:F2").Merge()
        calc.Range("A1").WrapText = True
        calc.Range("A1").Font.Name = "Calibri"
        calc.Range("A1").Font.Size = 12
        calc.Range("A1").Font.Color = NAVY
        calc.Rows("1").RowHeight = 36
        calc.Columns("AA").ColumnWidth = 22
        calc.Columns("AB").ColumnWidth = 18
        calc.Tab.Color = SLATE
        for hidden in ("KPI", "YoY", "Trend", "Rank", "Mix"):
            sheets[hidden].Visible = 0

        dashboard.Activate()
        workbook.Windows(1).DisplayGridlines = False
        workbook.Windows(1).Zoom = 90
        dashboard.Tab.Color = NAVY

        if OUT.exists():
            OUT.unlink()
        workbook.SaveAs(str(OUT), XL_OPENXML)
        print(json.dumps(stats, indent=2))
        verify_saved_state(dashboard, calc, stats)
    finally:
        try:
            if workbook is not None:
                workbook.Close(SaveChanges=False)
        except Exception:
            pass
        try:
            excel.Quit()
        except Exception:
            pass


def order_months(pivot) -> None:
    labels = [month_label(year, month) for year, month in MONTHS]
    field = pivot.PivotFields("Month")
    for position, label in enumerate(labels, start=1):
        try:
            field.PivotItems(label).Position = position
        except Exception:
            continue


def order_products(pivot) -> None:
    field = pivot.PivotFields("ProductLine")
    for position, label in enumerate(PRODUCTS, start=1):
        try:
            field.PivotItems(label).Position = position
        except Exception:
            continue


def write_formulas(pivots) -> None:
    labels = {
        3: "Revenue",
        4: "Seats",
        5: "Won",
        6: "Closed",
        8: "Revenue 2025",
        9: "Revenue 2026",
        10: "Seats 2025",
        11: "Seats 2026",
        12: "Won 2025",
        13: "Won 2026",
        14: "Closed 2025",
        15: "Closed 2026",
        17: "Year mode",
        19: "Revenue prior",
        20: "Revenue YoY",
        21: "Revenue delta",
        22: "Seats YoY",
        23: "Seats delta",
        24: "Conversion",
        25: "Conversion prior",
        26: "Conversion points",
    }
    for row, label in labels.items():
        pivots.Cells(row, 27).Value = label

    formulas = {
        3: '=IF(AB17="2026",AB9,IF(AB17="2025",AB8,IF(AB17="both",IF(ISNUMBER(AB8),AB8,0)+IF(ISNUMBER(AB9),AB9,0),NA())))',
        4: '=IF(AB17="2026",AB11,IF(AB17="2025",AB10,IF(AB17="both",IF(ISNUMBER(AB10),AB10,0)+IF(ISNUMBER(AB11),AB11,0),NA())))',
        5: '=IF(AB17="2026",AB13,IF(AB17="2025",AB12,IF(AB17="both",IF(ISNUMBER(AB12),AB12,0)+IF(ISNUMBER(AB13),AB13,0),NA())))',
        6: '=IF(AB17="2026",AB15,IF(AB17="2025",AB14,IF(AB17="both",IF(ISNUMBER(AB14),AB14,0)+IF(ISNUMBER(AB15),AB15,0),NA())))',
        8: '=IFERROR(GETPIVOTDATA("Won revenue",YoY!$B$4,"Year",2025),NA())',
        9: '=IFERROR(GETPIVOTDATA("Won revenue",YoY!$B$4,"Year",2026),NA())',
        10: '=IFERROR(GETPIVOTDATA("Active seats",YoY!$B$4,"Year",2025),NA())',
        11: '=IFERROR(GETPIVOTDATA("Active seats",YoY!$B$4,"Year",2026),NA())',
        12: '=IFERROR(GETPIVOTDATA("Won deals",YoY!$B$4,"Year",2025),NA())',
        13: '=IFERROR(GETPIVOTDATA("Won deals",YoY!$B$4,"Year",2026),NA())',
        14: '=IFERROR(GETPIVOTDATA("Closed deals",YoY!$B$4,"Year",2025),NA())',
        15: '=IFERROR(GETPIVOTDATA("Closed deals",YoY!$B$4,"Year",2026),NA())',
        17: (
            '=IF(AND(ISNUMBER(GETPIVOTDATA("Won revenue",KPI!$B$4,"Year",2025)),'
            'ISNUMBER(GETPIVOTDATA("Won revenue",KPI!$B$4,"Year",2026))),"both",'
            'IF(ISNUMBER(GETPIVOTDATA("Won revenue",KPI!$B$4,"Year",2026)),"2026",'
            'IF(ISNUMBER(GETPIVOTDATA("Won revenue",KPI!$B$4,"Year",2025)),"2025","none")))'
        ),
        19: '=IF(AB17="2026",AB8,NA())',
        20: '=IF(OR(AB17<>"2026",AB8=0),NA(),(AB9-AB8)/AB8)',
        21: '=IF(AB17<>"2026",NA(),AB9-AB8)',
        22: '=IF(OR(AB17<>"2026",AB10=0),NA(),(AB11-AB10)/AB10)',
        23: '=IF(AB17<>"2026",NA(),AB11-AB10)',
        24: '=IF(AB6=0,NA(),AB5/AB6)',
        25: '=IF(OR(AB17<>"2026",AB14=0),NA(),AB12/AB14)',
        26: '=IF(OR(NOT(ISNUMBER(AB24)),NOT(ISNUMBER(AB25))),NA(),AB24-AB25)',
    }
    for row, formula in formulas.items():
        pivots.Cells(row, 28).Formula = formula
    pivots.Range("AA1").Value = "Card math"
    pivots.Range("AA1").Font.Bold = True
    pivots.Range("AA3:AA26").Font.Name = "Calibri"
    pivots.Range("AB3:AB6").NumberFormat = "#,##0.00"
    pivots.Range("AB8:AB11").NumberFormat = "#,##0.00"
    pivots.Range("AB19:AB23").NumberFormat = "0.00%"
    pivots.Range("AB21").NumberFormat = "#,##0.00"
    pivots.Range("AB23").NumberFormat = "#,##0.00"
    pivots.Range("AB24:AB26").NumberFormat = "0.00%"


def layout_dashboard(dashboard) -> None:
    dashboard.Range("A:R").Font.Name = "Calibri"
    dashboard.Columns("A").ColumnWidth = 3
    for column in range(2, 18):
        dashboard.Columns(column).ColumnWidth = 12
    dashboard.Rows("1").RowHeight = 34
    dashboard.Rows("2").RowHeight = 20
    dashboard.Rows("3").RowHeight = 36
    dashboard.Rows("4").RowHeight = 10
    dashboard.Rows("5").RowHeight = 18
    dashboard.Rows("6").RowHeight = 42
    dashboard.Rows("7").RowHeight = 20
    dashboard.Rows("8").RowHeight = 8
    for row in range(9, 18):
        dashboard.Rows(str(row)).RowHeight = 16
    dashboard.Rows("18").RowHeight = 8
    for row in range(19, 36):
        dashboard.Rows(str(row)).RowHeight = 15
    dashboard.Rows("36").RowHeight = 8
    for row in range(37, 53):
        dashboard.Rows(str(row)).RowHeight = 15
    dashboard.Rows("53").RowHeight = 22

    header = dashboard.Range("B1:Q1")
    header.Merge()
    header.Value = "Harborline"
    header.Font.Size = 26
    header.Font.Bold = True
    header.Font.Color = WHITE
    header.Interior.Color = NAVY
    header.VerticalAlignment = -4108
    header.HorizontalAlignment = -4131

    sub = dashboard.Range("B2:Q2")
    sub.Merge()
    sub.Value = "Won revenue dashboard  ·  January–October  ·  2025 and 2026  ·  Fictional company"
    sub.Font.Size = 11
    sub.Font.Color = rgb(214, 224, 240)
    sub.Interior.Color = NAVY
    sub.VerticalAlignment = -4108

    note = dashboard.Range("B3:Q3")
    note.Merge()
    note.Value = (
        "Select one year. Every slicer filters the charts and the table together. "
        "Growth compares that year with the year before, for the same quarter, region, product line, and status. "
        "Steps are on the Walkthrough sheet."
    )
    note.Font.Size = 11
    note.Font.Color = SLATE
    note.Interior.Color = PAPER
    note.WrapText = True
    note.VerticalAlignment = -4108

    cards = (
        (2, 4, "Revenue", "=IF(ISNUMBER(Calc!AB3),Calc!AB3,\"—\")", revenue_chip(), '"$"#,##0'),
        (6, 8, "Active seats", "=IF(ISNUMBER(Calc!AB4),Calc!AB4,\"—\")", seats_chip(), "#,##0"),
        (10, 12, "Conversion", "=IF(ISNUMBER(Calc!AB24),Calc!AB24,\"—\")", conversion_chip(), "0.0%"),
        (14, 16, "YoY growth", "=IF(ISNUMBER(Calc!AB20),Calc!AB20,\"—\")", delta_chip(), "0.0%"),
    )
    for start, end, label, value, chip, number_format in cards:
        dashboard.Range(dashboard.Cells(5, start), dashboard.Cells(5, end)).Merge()
        dashboard.Range(dashboard.Cells(6, start), dashboard.Cells(6, end)).Merge()
        dashboard.Range(dashboard.Cells(7, start), dashboard.Cells(7, end)).Merge()
        card_border(dashboard.Range(dashboard.Cells(5, start), dashboard.Cells(7, end)))
        label_cell = dashboard.Cells(5, start)
        value_cell = dashboard.Cells(6, start)
        chip_cell = dashboard.Cells(7, start)
        label_cell.Value = label
        label_cell.Font.Size = 11
        label_cell.Font.Bold = True
        label_cell.Font.Color = SLATE
        label_cell.HorizontalAlignment = -4108
        value_cell.Formula = value
        value_cell.NumberFormat = number_format
        value_cell.Font.Size = 26
        value_cell.Font.Bold = True
        value_cell.Font.Color = NAVY
        value_cell.HorizontalAlignment = -4108
        chip_cell.Formula = chip
        chip_cell.Font.Size = 11
        chip_cell.Font.Bold = True
        chip_cell.Font.Color = SLATE
        chip_cell.HorizontalAlignment = -4108
        add_chip_colors(chip_cell)

    title = dashboard.Range("B53:Q53")
    title.Merge()
    title.Value = "Records behind the charts"
    title.Font.Size = 14
    title.Font.Bold = True
    title.Font.Color = NAVY
    title.VerticalAlignment = -4108


def revenue_chip() -> str:
    return (
        '=IF(Calc!AB17="both","Select one year",'
        'IF(Calc!AB17="2025","No 2024 baseline",'
        'IF(NOT(ISNUMBER(Calc!AB20)),"—",'
        'IF(Calc!AB20>=0,"▲ +"&TEXT(Calc!AB20,"0.0%")&" vs prior year",'
        '"▼ "&TEXT(Calc!AB20,"0.0%")&" vs prior year"))))'
    )


def seats_chip() -> str:
    return (
        '=IF(Calc!AB17="both","Select one year",'
        'IF(Calc!AB17="2025","No 2024 baseline",'
        'IF(NOT(ISNUMBER(Calc!AB22)),"—",'
        'IF(Calc!AB22>=0,"▲ +"&TEXT(Calc!AB22,"0.0%")&" vs prior year",'
        '"▼ "&TEXT(Calc!AB22,"0.0%")&" vs prior year"))))'
    )


def conversion_chip() -> str:
    return (
        '=IF(Calc!AB17="both","Select one year",'
        'IF(Calc!AB17="2025","No 2024 baseline",'
        'IF(NOT(ISNUMBER(Calc!AB26)),"—",'
        'IF(Calc!AB26>=0,"▲ +"&TEXT(Calc!AB26*100,"0.0")&" pt vs prior year",'
        '"▼ "&TEXT(Calc!AB26*100,"0.0")&" pt vs prior year"))))'
    )


def delta_chip() -> str:
    return (
        '=IF(Calc!AB17="both","Select one year",'
        'IF(Calc!AB17="2025","No 2024 baseline",'
        'IF(NOT(ISNUMBER(Calc!AB21)),"—",'
        'IF(Calc!AB21>=0,"▲ +"&TEXT(Calc!AB21,"$#,##0")&" vs prior year",'
        '"▼ "&TEXT(Calc!AB21,"$#,##0")&" vs prior year"))))'
    )


def add_chip_colors(cell) -> None:
    address = cell.Address
    up = cell.FormatConditions.Add(XL_EXPRESSION, 0, f'=LEFT({address},1)="▲"')
    up.Font.Color = GREEN
    down = cell.FormatConditions.Add(XL_EXPRESSION, 0, f'=LEFT({address},1)="▼"')
    down.Font.Color = RED


def place_charts(dashboard, trend, rank, mix) -> None:
    line_box = box(dashboard, 19, 2, 35, 9)
    bar_box = box(dashboard, 19, 10, 35, 17)
    stack_box = box(dashboard, 37, 2, 52, 17)
    add_chart(dashboard, trend, line_box, XL_LINE, "Won revenue by month", "line")
    add_chart(dashboard, rank, bar_box, XL_BAR, "Territories ranked by won revenue", "bar")
    add_chart(dashboard, mix, stack_box, XL_COLUMN_STACKED, "Product mix by region", "column")


def box(sheet, top_row: int, left_col: int, bottom_row: int, right_col: int) -> tuple[float, float, float, float]:
    top = sheet.Cells(top_row, left_col).Top
    left = sheet.Cells(top_row, left_col).Left
    bottom = sheet.Cells(bottom_row, right_col).Top + sheet.Rows(bottom_row).RowHeight
    right = sheet.Cells(bottom_row, right_col).Left + sheet.Columns(right_col).Width
    return left, top, right - left, bottom - top


def add_chart(sheet, pivot, bounds, chart_type: int, title: str, kind: str):
    left, top, width, height = bounds
    chart_object = sheet.ChartObjects().Add(left, top, width, height)
    chart = chart_object.Chart
    chart.SetSourceData(pivot.TableRange1)
    chart.ChartType = chart_type
    polish_chart(chart, title, kind)
    return chart


def color_scale(pivot) -> None:
    body = pivot.DataBodyRange
    sheet = pivot.Parent
    header_row = body.Row - 1
    for offset in range(body.Columns.Count):
        header = sheet.Cells(header_row, body.Column + offset).Value
        if header != "Won revenue":
            continue
        column = sheet.Range(
            sheet.Cells(body.Row, body.Column + offset),
            sheet.Cells(body.Row + body.Rows.Count - 1, body.Column + offset),
        )
        scale = column.FormatConditions.AddColorScale(3)
        scale.ColorScaleCriteria(1).Type = 1
        scale.ColorScaleCriteria(1).FormatColor.Color = PAPER
        scale.ColorScaleCriteria(2).Type = 5
        scale.ColorScaleCriteria(2).Value = 50
        scale.ColorScaleCriteria(2).FormatColor.Color = rgb(232, 214, 154)
        scale.ColorScaleCriteria(3).Type = 2
        scale.ColorScaleCriteria(3).FormatColor.Color = rgb(143, 184, 214)
        return
    print("Won revenue column not found for color scale")
    print("detail headers", [sheet.Cells(header_row, body.Column + offset).Value for offset in range(body.Columns.Count)])


def read_number(sheet, address: str):
    value = sheet.Range(address).Value
    if value is None:
        return None
    return float(value)


def measure(excel, dashboard, pivots, trend, rank, year_cache, quarter_cache, region_cache, product_cache, status_cache) -> dict:
    def snapshot(prefix: str, store: dict) -> None:
        excel.Calculate()
        store[f"{prefix}_revenue"] = read_number(pivots, "AB3")
        store[f"{prefix}_seats"] = read_number(pivots, "AB4")
        store[f"{prefix}_conversion"] = read_number(pivots, "AB24")
        store[f"{prefix}_yoy"] = read_number(pivots, "AB20")
        store[f"{prefix}_delta"] = read_number(pivots, "AB21")
        store[f"{prefix}_seat_yoy"] = read_number(pivots, "AB22")
        store[f"{prefix}_points"] = read_number(pivots, "AB26")
        store[f"{prefix}_chip"] = dashboard.Range("B7").Value
        store[f"{prefix}_mode"] = pivots.Range("AB17").Value

    stats: dict = {}
    select_only(year_cache, {"2026"})
    for slicer_cache in (quarter_cache, region_cache, product_cache, status_cache):
        clear_slicer(slicer_cache)
    snapshot("base", stats)
    label, value = top_rank(rank)
    stats["top_territory"] = label
    stats["top_territory_revenue"] = float(value)
    stats["training_feb"] = pivot_lookup(trend, "Feb 2026", "Training")
    stats["training_mar"] = pivot_lookup(trend, "Mar 2026", "Training")
    stats["training_sep"] = pivot_lookup(trend, "Sep 2026", "Training")

    select_only(quarter_cache, {"Q1"})
    snapshot("q1", stats)
    select_only(quarter_cache, {"Q3"})
    snapshot("q3", stats)
    clear_slicer(quarter_cache)

    select_only(region_cache, {"Mountain"})
    snapshot("mountain", stats)
    clear_slicer(region_cache)
    select_only(region_cache, {"South"})
    snapshot("south", stats)
    select_only(year_cache, {"2025"})
    snapshot("south_2025", stats)
    select_only(year_cache, {"2026"})
    clear_slicer(region_cache)

    select_only(product_cache, {"Security Add-ons"})
    snapshot("security", stats)
    clear_slicer(product_cache)
    select_only(product_cache, {"Hardware Refresh"})
    snapshot("hardware", stats)
    clear_slicer(product_cache)
    select_only(product_cache, {"Cloud Seats"})
    snapshot("cloud", stats)
    clear_slicer(product_cache)

    select_only(status_cache, {"Won"})
    snapshot("won_only", stats)
    clear_slicer(status_cache)
    select_only(year_cache, {"2025"})
    snapshot("year_2025", stats)
    select_only(year_cache, {"2026"})
    return {key: json_ready(value) for key, value in stats.items()}


def json_ready(value):
    if isinstance(value, float):
        return round(value, 6)
    return value


def top_rank(pivot):
    body = pivot.DataBodyRange
    sheet = pivot.Parent
    best_label = None
    best_value = None
    for offset in range(body.Rows.Count):
        label = sheet.Cells(body.Row + offset, body.Column - 1).Value
        if str(label) in {"None", "Grand Total"}:
            continue
        value = float(body.Cells(offset + 1, 1).Value)
        if best_value is None or value > best_value:
            best_label = label
            best_value = value
    return best_label, best_value


def month_matches(label, row_label: str) -> bool:
    if hasattr(label, "year") and hasattr(label, "month"):
        parsed = datetime.strptime(row_label, "%b %Y")
        return label.year == parsed.year and label.month == parsed.month
    return str(label) == row_label


def pivot_lookup(pivot, row_label: str, column_label: str):
    body = pivot.DataBodyRange
    sheet = pivot.Parent
    header_rows = range(max(1, body.Row - 3), body.Row)
    column_index = None
    for header_row in header_rows:
        for offset in range(body.Columns.Count):
            header = sheet.Cells(header_row, body.Column + offset).Value
            if str(header) == column_label:
                column_index = offset
                break
        if column_index is not None:
            break
    if column_index is None:
        print("missing column", column_label)
        for header_row in header_rows:
            headers = [
                sheet.Cells(header_row, body.Column + offset).Value
                for offset in range(body.Columns.Count)
            ]
            print("headers", header_row, headers)
        return None
    for offset in range(body.Rows.Count):
        label = sheet.Cells(body.Row + offset, body.Column - 1).Value
        if month_matches(label, row_label):
            return float(body.Cells(offset + 1, column_index + 1).Value)
    print("missing row", row_label)
    labels = [
        sheet.Cells(body.Row + offset, body.Column - 1).Value
        for offset in range(body.Rows.Count)
    ]
    print("labels", labels)
    return None


def write_walkthrough(sheet) -> None:
    sheet.Range("A:D").Font.Name = "Calibri"
    sheet.Columns("A").ColumnWidth = 4
    sheet.Columns("B").ColumnWidth = 22
    sheet.Columns("C").ColumnWidth = 78
    sheet.Columns("D").ColumnWidth = 78
    sheet.Columns("E").ColumnWidth = 4
    sheet.Range("B2:D2").Merge()
    sheet.Range("B2").Value = "Walk through Harborline"
    sheet.Range("B2").Font.Size = 26
    sheet.Range("B2").Font.Bold = True
    sheet.Range("B2").Font.Color = NAVY
    sheet.Range("B3:D3").Merge()
    sheet.Range("B3").Value = (
        "Harborline is fictional. The book is won revenue for January through October, 2025 and 2026. "
        "Open Dashboard. Use one slicer at a time, then clear it before the next step. "
        "The clear-filter icon is on the slicer header."
    )
    sheet.Range("B3").WrapText = True
    sheet.Range("B3").RowHeight = 48
    link = sheet.Range("B4")
    link.Value = "Open the Dashboard tab to begin."
    link.Font.Size = 14
    link.Font.Color = TEAL
    link.Font.Bold = True
    headers = ("Step", "What to do", "What you should see")
    for column, text in enumerate(headers, start=2):
        cell = sheet.Cells(6, column)
        cell.Value = text
        cell.Font.Bold = True
        cell.Font.Color = WHITE
        cell.Interior.Color = NAVY
    sheet.Tab.Color = GOLD


def fill_walkthrough_numbers(sheet, stats: dict) -> None:
    steps = [
        (
            "1. Scorecards",
            "Leave Year on 2026. Clear Quarter, Region, Product line, and Status.",
            (
                f"Revenue is {money(stats['base_revenue'])}, {signed_percent(stats['base_yoy'])}. "
                f"Active seats are {int(round(stats['base_seats'])):,}, {signed_percent(stats['base_seat_yoy'])}. "
                f"Conversion is {percent(stats['base_conversion'])}, {points(stats['base_points'])}. "
                f"YoY growth is {signed_percent(stats['base_yoy'])}, a change of {money(stats['base_delta'])}."
            ),
        ),
        (
            "2. Trend",
            "Stay on 2026 with the other slicers clear. Read the monthly line chart.",
            (
                "Cloud Seats rises through the year. Hardware Refresh slopes down. "
                f"Training jumps from {money(stats['training_feb'])} in February "
                f"to {money(stats['training_mar'])} in March, then again in September "
                f"({money(stats['training_sep'])}). Support Plans stay nearly flat."
            ),
        ),
        (
            "3. Quarter slicer",
            "On Quarter, select only Q1. Note revenue. Clear Quarter, then select only Q3.",
            (
                f"Q1 won revenue is {money(stats['q1_revenue'])}. "
                f"Q3 is {money(stats['q3_revenue'])}. "
                "The line chart keeps only the months in that quarter. "
                "Growth restates for that quarter against the same quarter in 2025."
            ),
        ),
        (
            "4. Territory rank",
            "Clear Quarter. Read the horizontal bar chart.",
            (
                f"The top bar is {stats['top_territory']} at {money(stats['top_territory_revenue'])}. "
                "The sort is won revenue, high to low."
            ),
        ),
        (
            "5. Mountain mix",
            "On Region, select only Mountain. Read the stacked column and the growth chip.",
            (
                f"Mountain revenue is {money(stats['mountain_revenue'])}, "
                f"{signed_percent(stats['mountain_yoy'])} versus 2025. "
                f"The company is {signed_percent(stats['base_yoy'])}. "
                "The stack is heavy on Hardware Refresh, which is the declining line."
            ),
        ),
        (
            "6. Security add-ons",
            "Clear Region. On Product line, select only Security Add-ons.",
            (
                f"Security revenue is {money(stats['security_revenue'])}, "
                f"{signed_percent(stats['security_yoy'])} versus 2025. "
                f"Conversion is {percent(stats['security_conversion'])}, "
                f"against {percent(stats['base_conversion'])} for the company."
            ),
        ),
        (
            "7. South conversion",
            "Clear Product line. On Region, select only South. Then switch Year from 2026 to 2025 and back.",
            (
                f"South conversion in 2026 is {percent(stats['south_conversion'])}, "
                f"{points(stats['south_points'])} versus 2025. "
                f"In 2025 the South rate is {percent(stats['south_2025_conversion'])}. "
                "Revenue can look acceptable while the win rate is the problem."
            ),
        ),
        (
            "8. Status trap",
            "Clear Region. Set Year back to 2026. On Status, select only Won. Then clear Status.",
            (
                f"With only Won selected, conversion becomes {percent(stats['won_only_conversion']).replace('.0 percent', ' percent')} "
                "because lost quotes are hidden. Revenue does not change, because lost rows already contribute $0. "
                "The point chip goes to zero because 2025 is also 100 percent once losses are hidden. "
                "Clear Status to put the rate back."
            ),
        ),
        (
            "9. Detail table",
            "Clear every slicer except Year = 2026. Scroll to Records behind the charts.",
            (
                "The grid is region, product line, segment, and status. "
                "Won revenue has a color scale. Cloud Seats is the heavy block. Hardware Refresh is smaller. "
                "October still has Open quotes, with seats and revenue at zero."
            ),
        ),
        (
            "10. Reset",
            "Clear Quarter, Region, Product line, and Status. Leave Year on 2026.",
            (
                f"The cards return to {money(stats['base_revenue'])}, "
                f"{int(round(stats['base_seats'])):,} seats, "
                f"{percent(stats['base_conversion'])} conversion, "
                f"and {signed_percent(stats['base_yoy'])} growth. "
                "Selecting 2025 shows the revenue for that year and the chips say there is no 2024 baseline."
            ),
        ),
    ]
    for index, (step, action, expected) in enumerate(steps):
        row = 7 + index
        values = (step, action, expected)
        for column, text in enumerate(values, start=2):
            cell = sheet.Cells(row, column)
            cell.Value = text
            cell.WrapText = True
            cell.VerticalAlignment = -4160
            if index % 2 == 0:
                cell.Interior.Color = PAPER
        sheet.Rows(str(row)).RowHeight = 72

    definitions = [
        ("Revenue", "Sum of won quotes. Lost and open quotes count as zero, so they stay in the table without inflating revenue."),
        ("Active seats", "Seats on won deals only. This is the user count behind the bookings."),
        ("Conversion", "Won deals divided by closed deals. Open quotes are not wins and not losses."),
        ("YoY growth", "Selected year versus the year before, after every other slicer. 2025 has no 2024 row, so the chip says so."),
        ("Same filters", "Quarter, region, product line, and status apply to both years. The Year slicer chooses which year is on the charts."),
    ]
    sheet.Range("B18").Value = "What the cards mean"
    sheet.Range("B18").Font.Size = 18
    sheet.Range("B18").Font.Bold = True
    sheet.Range("B18").Font.Color = NAVY
    for index, (name, meaning) in enumerate(definitions):
        sheet.Cells(19 + index, 2).Value = name
        sheet.Cells(19 + index, 2).Font.Bold = True
        sheet.Cells(19 + index, 2).Font.Color = NAVY
        meaning_range = sheet.Range(sheet.Cells(19 + index, 3), sheet.Cells(19 + index, 4))
        meaning_range.Merge()
        meaning_range.Value = meaning
        meaning_range.WrapText = True
        sheet.Rows(str(19 + index)).RowHeight = 32
    sheet.Range("B25:D25").Merge()
    sheet.Range("B25").Value = (
        "Source columns are on Data, in the Bookings table. "
        "Calc holds the card formulas. KPI, YoY, Trend, Rank, and Mix are hidden pivot sheets. "
        "The Year slicer is not connected to the YoY pivot."
    )
    sheet.Range("B25").WrapText = True
    sheet.Range("B25").Font.Color = SLATE
    sheet.Rows("25").RowHeight = 32
    sheet.PageSetup.Orientation = 2
    sheet.PageSetup.FitToPagesWide = 1
    sheet.PageSetup.FitToPagesTall = 1
    sheet.PageSetup.PrintArea = "$B$2:$D$25"


def verify_saved_state(dashboard, pivots, stats: dict) -> None:
    revenue = read_number(pivots, "AB3")
    mode = pivots.Range("AB17").Value
    chip = dashboard.Range("B7").Value
    if mode != "2026":
        raise SystemExit(f"Expected year mode 2026, got {mode}")
    if revenue is None or revenue < 1_000_000:
        raise SystemExit(f"Revenue card is not a real total: {revenue}")
    if abs(revenue - stats["base_revenue"]) > 1:
        raise SystemExit("Revenue card did not return to the 2026 baseline.")
    if not str(chip).startswith("▲") and not str(chip).startswith("▼"):
        raise SystemExit(f"Growth chip did not render: {chip}")
    if dashboard.ChartObjects().Count != 3:
        raise SystemExit(f"Expected 3 charts, found {dashboard.ChartObjects().Count}")
    print("verified", money(revenue), chip)


if __name__ == "__main__":
    build()
