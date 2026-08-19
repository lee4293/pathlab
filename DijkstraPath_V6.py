import tkinter as tk
from tkinter import ttk
import heapq
import random
import time
from collections import deque
from dataclasses import dataclass
from enum import Enum, auto


class CellType(Enum):
    EMPTY = auto()
    WALL = auto()
    WEIGHT = auto()


@dataclass
class SearchEvent:
    kind: str
    cell: tuple | None = None
    value: float | None = None


class RoundedButton(tk.Canvas):
    """Theme-stable rounded button whose entire surface activates immediately."""

    def __init__(
        self, parent, *, text, command, bg, fg, hover_bg, pressed_bg, border,
        accent_bg, accent_fg, disabled_bg, disabled_fg, disabled_border,
        width_px=112, height_px=42, radius=10, font=("Helvetica", 10, "bold"),
        accent=False,
    ):
        super().__init__(
            parent, width=width_px, height=height_px, bg=parent.cget("bg"),
            highlightthickness=0, bd=0, relief="flat", cursor="hand2", takefocus=1,
        )
        self._text = text
        self._command = command
        self._base_bg = bg
        self._fg = fg
        self._hover_bg = hover_bg
        self._pressed_bg = pressed_bg
        self._border = border
        self._accent_bg = accent_bg
        self._accent_fg = accent_fg
        self._disabled_bg = disabled_bg
        self._disabled_fg = disabled_fg
        self._disabled_border = disabled_border
        self._radius = radius
        self._font = font
        self._accent = accent
        self._selected = False
        self._state = "normal"
        self._hovered = False
        self._pressed = False
        self._focused = False
        self._release_after_id = None

        self.bind("<Configure>", lambda _e: self._draw())
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)
        # Fire on mouse-down. This makes rapid repeated clicks deterministic and
        # avoids platform-specific release/hover edge cases on Canvas widgets.
        self.bind("<Button-1>", self._on_click)
        self.bind("<ButtonRelease-1>", self._on_release_visual)
        self.bind("<FocusIn>", self._on_focus_in)
        self.bind("<FocusOut>", self._on_focus_out)
        self.bind("<Key-space>", self._on_key)
        self.bind("<Key-Return>", self._on_key)
        self.after_idle(self._draw)

    def _rounded_shape(self, x1, y1, x2, y2, radius, fill):
        r = max(0, min(radius, (x2 - x1) / 2, (y2 - y1) / 2))
        if r <= 0:
            self.create_rectangle(x1, y1, x2, y2, fill=fill, outline="")
            return
        self.create_rectangle(x1 + r, y1, x2 - r, y2, fill=fill, outline="")
        self.create_rectangle(x1, y1 + r, x2, y2 - r, fill=fill, outline="")
        self.create_oval(x1, y1, x1 + 2 * r, y1 + 2 * r, fill=fill, outline="")
        self.create_oval(x2 - 2 * r, y1, x2, y1 + 2 * r, fill=fill, outline="")
        self.create_oval(x1, y2 - 2 * r, x1 + 2 * r, y2, fill=fill, outline="")
        self.create_oval(x2 - 2 * r, y2 - 2 * r, x2, y2, fill=fill, outline="")

    def _draw(self):
        self.delete("all")
        w = max(2, self.winfo_width())
        h = max(2, self.winfo_height())
        r = min(self._radius, max(2, h // 2 - 2))

        if self._state == "disabled":
            fill = self._disabled_bg
            fg = self._disabled_fg
            border = self._disabled_border
        else:
            base = self._accent_bg if (self._accent or self._selected) else self._base_bg
            fg = self._accent_fg if (self._accent or self._selected) else self._fg
            if self._pressed:
                fill = self._pressed_bg if not (self._accent or self._selected) else self._lighten(self._accent_bg, 0.18)
            elif self._hovered:
                fill = self._hover_bg if not (self._accent or self._selected) else self._lighten(self._accent_bg, 0.10)
            else:
                fill = base
            border = self._accent_bg if self._focused else self._border

        # Draw the border and fill as two clean rounded shapes instead of using
        # a smoothed polygon, which can produce jagged/frayed edges in Tk.
        self._rounded_shape(1, 1, w - 1, h - 1, r, border)
        inset = 1.5
        self._rounded_shape(inset + 1, inset + 1, w - inset - 1, h - inset - 1, max(1, r - 2), fill)
        self.create_text(
            w / 2, h / 2, text=self._text, fill=fg, font=self._font, anchor="center"
        )

    @staticmethod
    def _lighten(hex_color, amount):
        h = hex_color.lstrip("#")
        if len(h) != 6:
            return hex_color
        vals = [int(h[i:i+2], 16) for i in (0, 2, 4)]
        vals = [round(v + (255 - v) * amount) for v in vals]
        return "#" + "".join(f"{v:02x}" for v in vals)

    def _on_enter(self, _event):
        self._hovered = True
        self._draw()

    def _on_leave(self, _event):
        self._hovered = False
        # Do not gate future clicks on leave/re-enter state.
        self._draw()

    def _on_click(self, _event):
        if self._state == "disabled":
            return "break"
        self.focus_set()
        self._pressed = True
        self._draw()

        # Give a short tactile pressed flash without blocking the command.
        if self._release_after_id is not None:
            try:
                self.after_cancel(self._release_after_id)
            except tk.TclError:
                pass
        self._release_after_id = self.after(75, self._release_press_visual)

        if self._command:
            self._command()
        return "break"

    def _release_press_visual(self):
        self._release_after_id = None
        self._pressed = False
        self._draw()

    def _on_release_visual(self, _event):
        # Command already fired on press; release only clears the visual state.
        self._pressed = False
        self._draw()
        return "break"

    def _on_key(self, _event):
        if self._state != "disabled" and self._command:
            self._command()
        return "break"

    def _on_focus_in(self, _event):
        self._focused = True
        self._draw()

    def _on_focus_out(self, _event):
        self._focused = False
        self._draw()

    def set_text(self, text):
        self._text = text
        self._draw()

    def set_state(self, state):
        self._state = state
        self.configure(cursor="arrow" if state == "disabled" else "hand2")
        self._pressed = False
        self._draw()

    def set_selected(self, selected):
        self._selected = bool(selected)
        self._draw()


class RoundedDropdown(tk.Canvas):
    """Dark, rounded dropdown whose entire field opens the menu."""

    def __init__(
        self, parent, *, variable, values, on_change, bg, fg, hover_bg, border,
        accent, menu_bg, menu_fg, width_px=190, height_px=42, radius=10,
    ):
        super().__init__(
            parent, width=width_px, height=height_px, bg=parent.cget("bg"),
            highlightthickness=0, bd=0, relief="flat", cursor="hand2", takefocus=1,
        )
        self.variable = variable
        self.values = tuple(values)
        self.on_change = on_change
        self._bg = bg
        self._fg = fg
        self._hover_bg = hover_bg
        self._border = border
        self._accent = accent
        self._menu_bg = menu_bg
        self._menu_fg = menu_fg
        self._radius = radius
        self._hovered = False
        self._focused = False

        self.menu = tk.Menu(
            self, tearoff=0, bg=menu_bg, fg=menu_fg,
            activebackground=accent, activeforeground="#07111f",
            relief="flat", bd=1, font=("Helvetica", 10),
        )
        for value in self.values:
            self.menu.add_command(label=value, command=lambda v=value: self._choose(v))

        self.bind("<Configure>", lambda _e: self._draw())
        self.bind("<Enter>", self._on_enter)
        self.bind("<Leave>", self._on_leave)
        self.bind("<Button-1>", self._show_menu)
        self.bind("<FocusIn>", self._on_focus_in)
        self.bind("<FocusOut>", self._on_focus_out)
        self.bind("<Key-space>", self._show_menu)
        self.bind("<Key-Return>", self._show_menu)
        self.variable.trace_add("write", lambda *_: self._draw())
        self.after_idle(self._draw)

    def _rounded_shape(self, x1, y1, x2, y2, radius, fill):
        r = max(0, min(radius, (x2 - x1) / 2, (y2 - y1) / 2))
        if r <= 0:
            self.create_rectangle(x1, y1, x2, y2, fill=fill, outline="")
            return
        self.create_rectangle(x1 + r, y1, x2 - r, y2, fill=fill, outline="")
        self.create_rectangle(x1, y1 + r, x2, y2 - r, fill=fill, outline="")
        self.create_oval(x1, y1, x1 + 2 * r, y1 + 2 * r, fill=fill, outline="")
        self.create_oval(x2 - 2 * r, y1, x2, y1 + 2 * r, fill=fill, outline="")
        self.create_oval(x1, y2 - 2 * r, x1 + 2 * r, y2, fill=fill, outline="")
        self.create_oval(x2 - 2 * r, y2 - 2 * r, x2, y2, fill=fill, outline="")

    def _draw(self):
        self.delete("all")
        w = max(2, self.winfo_width())
        h = max(2, self.winfo_height())
        r = min(self._radius, max(2, h // 2 - 2))
        fill = self._hover_bg if self._hovered else self._bg
        border = self._accent if self._focused else self._border
        self._rounded_shape(1, 1, w - 1, h - 1, r, border)
        self._rounded_shape(2.5, 2.5, w - 2.5, h - 2.5, max(1, r - 2), fill)
        self.create_text(
            13, h / 2, text=self.variable.get(), fill=self._fg,
            font=("Helvetica", 10, "bold"), anchor="w"
        )
        # Chevron rather than a native platform indicator so its color is reliable.
        cx = w - 18
        cy = h / 2 - 1
        self.create_line(cx - 4, cy - 2, cx, cy + 2, cx + 4, cy - 2, fill=self._fg, width=2)

    def _on_enter(self, _event):
        self._hovered = True
        self._draw()

    def _on_leave(self, _event):
        self._hovered = False
        self._draw()

    def _on_focus_in(self, _event):
        self._focused = True
        self._draw()

    def _on_focus_out(self, _event):
        self._focused = False
        self._draw()

    def _show_menu(self, _event=None):
        self.focus_set()
        self._focused = True
        self._draw()
        try:
            self.menu.tk_popup(self.winfo_rootx(), self.winfo_rooty() + self.winfo_height())
        finally:
            self.menu.grab_release()
        return "break"

    def _choose(self, value):
        changed = self.variable.get() != value
        self.variable.set(value)
        if changed and self.on_change:
            self.after_idle(self.on_change)



class PathfindingVisualizer:
    # Theme
    BG = "#0b1020"
    PANEL = "#11182b"
    PANEL_2 = "#172038"
    BORDER = "#25314e"
    TEXT = "#e8edf7"
    MUTED = "#8f9bb3"
    ACCENT = "#6ea8fe"
    ACCENT_2 = "#9b8cff"
    GRID_BG = "#0d1426"
    GRID_LINE = "#1d2944"
    EMPTY = "#111a30"
    WALL = "#aeb9cf"
    WEIGHT = "#7b5f35"
    FRONTIER = "#315d8f"
    VISITED = "#244664"
    CURRENT = "#ffd166"
    START = "#43d17c"
    TARGET = "#ff6384"
    PATH = "#f8e16c"
    PATH_EDGE = "#fff3a1"

    DIRS = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def __init__(self, root):
        self.root = root
        self.root.title("Pathfinding Lab")
        self.root.geometry("1240x790")
        self.root.minsize(920, 640)
        self.root.configure(bg=self.BG)

        self.rows = 25
        self.cols = 35
        self.grid = []
        self.start = (self.rows // 2, 5)
        self.target = (self.rows // 2, self.cols - 6)

        self.tool = "wall"
        self.algorithm_name = tk.StringVar(value="Dijkstra")
        self.maze_name = tk.StringVar(value="Random Walls")
        self.grid_size_name = tk.StringVar(value="25 × 35")
        self.weight_value = tk.IntVar(value=5)
        self.speed_value = tk.IntVar(value=90)
        self.density_value = tk.IntVar(value=28)

        self.frontier = set()
        self.visited = set()
        self.current = None
        self.path = []
        self.distance_labels = {}

        self.events = []
        self.event_index = 0
        self.running = False
        self.paused = False
        self.animation_after_id = None
        self.search_started_at = None
        self.algorithm_runtime_ms = 0.0

        self.dragging = False
        self.last_drag_cell = None
        self.dragging_endpoint = None

        self.visited_count = tk.StringVar(value="0")
        self.path_length = tk.StringVar(value="0")
        self.path_cost = tk.StringVar(value="0")
        self.runtime_ms = tk.StringVar(value="0.00 ms")
        self.status_text = tk.StringVar(value="Ready")
        self.speed_label_text = tk.StringVar(value="90")
        self.search_complete = False
        self.last_search_found_path = False

        self.tool_buttons = {}
        self._configure_styles()
        self._build_ui()
        self._reset_grid_data()
        self.root.bind("<space>", self._shortcut_space)
        self.root.bind("<Key-n>", lambda e: self.step_once())
        self.root.bind("<Key-b>", lambda e: self.step_back_once())
        self.root.bind("<Key-r>", lambda e: self.reset_all())
        self.root.after(50, self.redraw)

    # ---------- UI ----------
    def _configure_styles(self):
        style = ttk.Style()
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure(
            "Dark.TCombobox",
            fieldbackground=self.PANEL_2,
            background=self.PANEL_2,
            foreground=self.TEXT,
            arrowcolor=self.TEXT,
            bordercolor=self.BORDER,
            lightcolor=self.PANEL_2,
            darkcolor=self.PANEL_2,
            padding=6,
        )
        style.map(
            "Dark.TCombobox",
            fieldbackground=[("readonly", self.PANEL_2)],
            foreground=[("readonly", self.TEXT)],
            selectbackground=[("readonly", self.PANEL_2)],
            selectforeground=[("readonly", self.TEXT)],
        )

        style.configure(
            "Horizontal.TScale",
            background=self.PANEL,
            troughcolor=self.PANEL_2,
            bordercolor=self.PANEL,
            lightcolor=self.PANEL,
            darkcolor=self.PANEL,
        )
        # Give the animation-speed thumb extra contrast without brightening the
        # track itself. The clam theme uses background/light/dark colors for the
        # draggable slider element.
        style.configure(
            "Speed.Horizontal.TScale",
            background="#a9c9ff",
            troughcolor=self.PANEL_2,
            bordercolor=self.PANEL,
            lightcolor="#c8ddff",
            darkcolor=self.ACCENT,
            sliderrelief="flat",
            sliderlength=18,
        )
        style.map(
            "Speed.Horizontal.TScale",
            background=[("active", "#c8ddff")],
            lightcolor=[("active", "#e0ecff")],
            darkcolor=[("active", "#8bb8ff")],
        )

    def _build_ui(self):
        header = tk.Frame(self.root, bg=self.BG)
        header.pack(fill="x", padx=24, pady=(18, 10))

        tk.Label(
            header,
            text="PATHFINDING LAB",
            bg=self.BG,
            fg=self.TEXT,
            font=("Helvetica", 18, "bold"),
        ).pack(side="left")

        header_actions = tk.Frame(header, bg=self.BG)
        header_actions.pack(side="right")

        self.guide_btn = self._button(
            header_actions, "Guide", self.show_guide, width=7, height=34, radius=9
        )
        self.guide_btn.pack(side="left", padx=(0, 8))

        tk.Label(
            header_actions,
            textvariable=self.status_text,
            bg=self.PANEL_2,
            fg=self.ACCENT,
            font=("Helvetica", 10, "bold"),
            padx=12,
            pady=6,
        ).pack(side="left")

        body = tk.Frame(self.root, bg=self.BG)
        body.pack(fill="both", expand=True, padx=24, pady=(0, 14))

        self.sidebar = tk.Frame(body, bg=self.PANEL, width=250, highlightthickness=1, highlightbackground=self.BORDER)
        self.sidebar.pack(side="left", fill="y", padx=(0, 14))
        self.sidebar.pack_propagate(False)

        board_panel = tk.Frame(body, bg=self.PANEL, highlightthickness=1, highlightbackground=self.BORDER)
        board_panel.pack(side="left", fill="both", expand=True)

        self._build_sidebar()

        canvas_wrap = tk.Frame(board_panel, bg=self.GRID_BG)
        canvas_wrap.pack(fill="both", expand=True, padx=12, pady=12)

        self.canvas = tk.Canvas(canvas_wrap, bg=self.GRID_BG, highlightthickness=0, cursor="crosshair")
        self.canvas.pack(fill="both", expand=True)

        self.canvas.bind("<Configure>", lambda e: self.redraw())
        self.canvas.bind("<Button-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.canvas.bind("<Button-3>", self.on_right_click)

        footer = tk.Frame(self.root, bg=self.PANEL, highlightthickness=1, highlightbackground=self.BORDER)
        footer.pack(fill="x", padx=24, pady=(0, 18))
        self._build_footer(footer)

    def _section_title(self, parent, text):
        tk.Label(
            parent,
            text=text.upper(),
            bg=self.PANEL,
            fg=self.MUTED,
            font=("Helvetica", 9, "bold"),
        ).pack(anchor="w", padx=16, pady=(16, 7))

    def _build_sidebar(self):
        self._section_title(self.sidebar, "Algorithm")
        algo = self._dropdown(
            self.sidebar,
            self.algorithm_name,
            ("Dijkstra", "A*", "BFS", "Greedy Best-First"),
            on_change=self._algorithm_changed,
        )
        algo.pack(fill="x", padx=16)

        self._section_title(self.sidebar, "Tools")
        tools = (
            ("wall", "Wall"),
            ("erase", "Eraser"),
            ("weight", "Weight"),
            ("start", "Move Start"),
            ("target", "Move Target"),
        )
        tool_frame = tk.Frame(self.sidebar, bg=self.PANEL)
        tool_frame.pack(fill="x", padx=12)
        for i, (key, label) in enumerate(tools):
            btn = self._button(
                tool_frame, label, lambda k=key: self.set_tool(k),
                width=9, height=40, radius=9,
            )
            btn.grid(row=i // 2, column=i % 2, sticky="ew", padx=4, pady=4)
            tool_frame.grid_columnconfigure(i % 2, weight=1)
            self.tool_buttons[key] = btn
        self._refresh_tool_buttons()

        weight_row = tk.Frame(self.sidebar, bg=self.PANEL)
        weight_row.pack(fill="x", padx=16, pady=(7, 0))
        tk.Label(weight_row, text="Weight cost", bg=self.PANEL, fg=self.MUTED, font=("Helvetica", 9)).pack(side="left")
        tk.Spinbox(
            weight_row,
            from_=2,
            to=9,
            textvariable=self.weight_value,
            width=4,
            bg=self.PANEL_2,
            fg=self.TEXT,
            buttonbackground=self.PANEL_2,
            relief="flat",
            insertbackground=self.TEXT,
        ).pack(side="right")

        self._section_title(self.sidebar, "Maze")
        maze = self._dropdown(
            self.sidebar,
            self.maze_name,
            ("Random Walls", "Recursive Division", "Staircase", "Weighted Terrain"),
        )
        maze.pack(fill="x", padx=16)

        density_row = tk.Frame(self.sidebar, bg=self.PANEL)
        density_row.pack(fill="x", padx=16, pady=(10, 0))
        tk.Label(density_row, text="Density", bg=self.PANEL, fg=self.MUTED, font=("Helvetica", 9)).pack(side="left")
        self.density_label = tk.Label(density_row, text="28%", bg=self.PANEL, fg=self.TEXT, font=("Helvetica", 9, "bold"))
        self.density_label.pack(side="right")
        density = ttk.Scale(self.sidebar, from_=8, to=48, variable=self.density_value, command=self._density_changed)
        density.pack(fill="x", padx=16, pady=(2, 8))

        self._button(self.sidebar, "Generate Maze", self.generate_maze, accent=True).pack(fill="x", padx=16, pady=(2, 0))

        self._section_title(self.sidebar, "Board")
        size = self._dropdown(
            self.sidebar,
            self.grid_size_name,
            ("15 × 25", "20 × 30", "25 × 35", "30 × 45", "40 × 60"),
            on_change=self.change_grid_size,
        )
        size.pack(fill="x", padx=16)

        speed_header = tk.Frame(self.sidebar, bg=self.PANEL)
        speed_header.pack(fill="x", padx=16, pady=(12, 0))
        tk.Label(speed_header, text="Animation speed", bg=self.PANEL, fg=self.MUTED, font=("Helvetica", 9)).pack(side="left")
        tk.Label(speed_header, textvariable=self.speed_label_text, bg=self.PANEL, fg=self.TEXT, font=("Helvetica", 9, "bold")).pack(side="right")
        speed = ttk.Scale(
            self.sidebar,
            from_=1,
            to=300,
            variable=self.speed_value,
            command=self._speed_changed,
            style="Speed.Horizontal.TScale",
        )
        speed.pack(fill="x", padx=16, pady=(3, 0))

    def _build_footer(self, parent):
        controls = tk.Frame(parent, bg=self.PANEL)
        controls.pack(side="left", padx=14, pady=10)

        # One uniform gap and one uniform width keeps the transport controls
        # visually grouped and evenly spaced.
        button_gap = 4
        button_width = 9

        self.run_btn = self._button(
            controls, "▶ Run", self.run_search, accent=True, width=button_width
        )
        self.run_btn.pack(side="left", padx=button_gap)

        self.back_step_btn = self._button(
            controls, "◀ Step", self.step_back_once, width=button_width
        )
        self.back_step_btn.pack(side="left", padx=button_gap)

        self.pause_btn = self._button(
            controls, "⏸ Pause", self.toggle_pause, width=button_width
        )
        self.pause_btn.pack(side="left", padx=button_gap)

        self.step_btn = self._button(
            controls, "Step ▶", self.step_once, width=button_width
        )
        self.step_btn.pack(side="left", padx=button_gap)

        self.reset_btn = self._button(
            controls, "Reset", self.reset_all, width=button_width
        )
        self.reset_btn.pack(side="left", padx=button_gap)

        stats = tk.Frame(parent, bg=self.PANEL)
        stats.pack(side="right", padx=16, pady=8)
        self._stat(stats, "Visited", self.visited_count, 0)
        self._stat(stats, "Path", self.path_length, 1)
        self._stat(stats, "Cost", self.path_cost, 2)
        self._stat(stats, "Runtime", self.runtime_ms, 3)

    def _button(self, parent, text, command, accent=False, width=None, height=42, radius=10):
        pixel_width = max(88, (width or 14) * 12)
        return RoundedButton(
            parent,
            text=text,
            command=command,
            bg=self.PANEL_2,
            fg=self.TEXT,
            hover_bg="#222e49",
            pressed_bg="#314266",
            border=self.BORDER,
            accent_bg=self.ACCENT,
            accent_fg="#07111f",
            disabled_bg="#121a2d",
            disabled_fg="#65728d",
            disabled_border="#202a43",
            width_px=pixel_width,
            height_px=height,
            radius=radius,
            accent=accent,
        )

    def _dropdown(self, parent, variable, values, on_change=None):
        return RoundedDropdown(
            parent,
            variable=variable,
            values=values,
            on_change=on_change,
            bg=self.PANEL_2,
            fg=self.TEXT,
            hover_bg="#202c47",
            border=self.BORDER,
            accent=self.ACCENT,
            menu_bg=self.PANEL_2,
            menu_fg=self.TEXT,
        )

    def _algorithm_changed(self):
        self.cancel_animation(clear_search=True)
        self._invalidate_explanation()

    def _speed_changed(self, _=None):
        self.speed_label_text.set(str(int(float(self.speed_value.get()))))

    def _stat(self, parent, title, variable, col):
        wrap = tk.Frame(parent, bg=self.PANEL_2, highlightthickness=1, highlightbackground=self.BORDER)
        wrap.grid(row=0, column=col, padx=4, sticky="nsew")
        tk.Label(wrap, text=title, bg=self.PANEL_2, fg=self.MUTED, font=("Helvetica", 8, "bold")).pack(padx=12, pady=(5, 0))
        tk.Label(wrap, textvariable=variable, bg=self.PANEL_2, fg=self.TEXT, font=("Helvetica", 11, "bold")).pack(padx=12, pady=(0, 5))

    def _density_changed(self, _=None):
        self.density_label.config(text=f"{int(self.density_value.get())}%")

    def set_tool(self, tool):
        self.tool = tool
        self._refresh_tool_buttons()

    def _refresh_tool_buttons(self):
        for key, btn in self.tool_buttons.items():
            btn.set_selected(key == self.tool)

    def _shortcut_space(self, _event=None):
        if self.running:
            self.toggle_pause()
        else:
            self.run_search()

    # ---------- Grid ----------
    def _reset_grid_data(self):
        self.grid = [[CellType.EMPTY for _ in range(self.cols)] for _ in range(self.rows)]
        self.weights = [[1 for _ in range(self.cols)] for _ in range(self.rows)]
        self.clear_search_state()

    def clear_search_state(self):
        self.frontier.clear()
        self.visited.clear()
        self.current = None
        self.path = []
        self.distance_labels = {}
        self.events = []
        self.event_index = 0
        self.visited_count.set("0")
        self.path_length.set("0")
        self.path_cost.set("0")
        self.runtime_ms.set("0.00 ms")

    def _invalidate_explanation(self):
        # Retained as an internal search-state reset hook. The Guide is permanent
        # and intentionally remains available before, during, and after a run.
        self.search_complete = False
        self.last_search_found_path = False

    def clear_board(self):
        """Clear walls, weights, and search visualization while preserving current settings and endpoints."""
        self.cancel_animation()
        self.grid = [[CellType.EMPTY for _ in range(self.cols)] for _ in range(self.rows)]
        self.weights = [[1 for _ in range(self.cols)] for _ in range(self.rows)]
        self.clear_search_state()
        self._invalidate_explanation()
        self.status_text.set("Board cleared")
        self.redraw()

    def reset_search(self):
        """Reset only the current visualization; retained for internal/keyboard compatibility."""
        self.cancel_animation()
        self.clear_search_state()
        self._invalidate_explanation()
        self.status_text.set("Search reset")
        self.redraw()

    def reset_all(self):
        """Restore every configurable parameter to its default and clear the board."""
        self.cancel_animation()
        self.algorithm_name.set("Dijkstra")
        self.maze_name.set("Random Walls")
        self.grid_size_name.set("25 × 35")
        self.weight_value.set(5)
        self.speed_value.set(90)
        self.speed_label_text.set("90")
        self.density_value.set(28)
        self.density_label.config(text="28%")
        self.tool = "wall"
        self.rows, self.cols = 25, 35
        self.start = (self.rows // 2, 5)
        self.target = (self.rows // 2, self.cols - 6)
        self._reset_grid_data()
        self._refresh_tool_buttons()
        self._invalidate_explanation()
        self.status_text.set("Reset to defaults")
        self.redraw()

    def change_grid_size(self, _=None):
        text = self.grid_size_name.get().replace(" ", "")
        r, c = text.split("×")
        self.rows, self.cols = int(r), int(c)
        self.start = (self.rows // 2, max(2, self.cols // 7))
        self.target = (self.rows // 2, min(self.cols - 3, self.cols - self.cols // 7))
        self.grid = [[CellType.EMPTY for _ in range(self.cols)] for _ in range(self.rows)]
        self.weights = [[1 for _ in range(self.cols)] for _ in range(self.rows)]
        self.clear_search_state()
        self._invalidate_explanation()
        self.status_text.set(f"Grid resized to {self.rows} × {self.cols}")
        self.redraw()

    def board_geometry(self):
        w = max(1, self.canvas.winfo_width())
        h = max(1, self.canvas.winfo_height())
        cell = min(w / self.cols, h / self.rows)
        board_w = cell * self.cols
        board_h = cell * self.rows
        ox = (w - board_w) / 2
        oy = (h - board_h) / 2
        return cell, ox, oy

    def event_to_cell(self, event):
        cell, ox, oy = self.board_geometry()
        c = int((event.x - ox) // cell)
        r = int((event.y - oy) // cell)
        if 0 <= r < self.rows and 0 <= c < self.cols:
            return r, c
        return None

    def is_endpoint(self, cell):
        return cell == self.start or cell == self.target

    def on_press(self, event):
        if self.running and not self.paused:
            return
        cell = self.event_to_cell(event)
        if not cell:
            return
        self.cancel_animation(clear_search=True)
        self._invalidate_explanation()
        self.dragging = True
        self.last_drag_cell = cell

        # Endpoints are movable only while their explicit tool is selected.
        # Clicking/dragging the S or T tile with Wall/Erase/Weight selected does
        # not implicitly switch into endpoint-drag mode.
        if self.tool in ("start", "target"):
            self.dragging_endpoint = self.tool
            self.apply_tool(cell)
        else:
            self.dragging_endpoint = None
            self.apply_tool(cell)

    def on_drag(self, event):
        if not self.dragging:
            return
        cell = self.event_to_cell(event)
        if not cell or cell == self.last_drag_cell:
            return
        self.last_drag_cell = cell

        if self.dragging_endpoint in ("start", "target"):
            self.apply_tool(cell)
        else:
            self.apply_tool(cell)

    def on_release(self, _event):
        self.dragging = False
        self.dragging_endpoint = None
        self.last_drag_cell = None

    def on_right_click(self, event):
        cell = self.event_to_cell(event)
        if not cell or self.is_endpoint(cell):
            return
        self.cancel_animation(clear_search=True)
        self._invalidate_explanation()
        r, c = cell
        self.grid[r][c] = CellType.EMPTY
        self.weights[r][c] = 1
        self.redraw()

    def apply_tool(self, cell):
        self._invalidate_explanation()
        if self.is_endpoint(cell):
            return
        r, c = cell
        if self.tool == "wall":
            self.grid[r][c] = CellType.WALL
            self.weights[r][c] = 1
        elif self.tool == "erase":
            self.grid[r][c] = CellType.EMPTY
            self.weights[r][c] = 1
        elif self.tool == "weight":
            self.grid[r][c] = CellType.WEIGHT
            self.weights[r][c] = max(2, min(9, int(self.weight_value.get())))
        elif self.tool == "start":
            if self.grid[r][c] != CellType.WALL and cell != self.target:
                self.start = cell
        elif self.tool == "target":
            if self.grid[r][c] != CellType.WALL and cell != self.start:
                self.target = cell
        self.redraw()

    # ---------- Drawing ----------
    def redraw(self):
        if not hasattr(self, "canvas"):
            return
        self.canvas.delete("all")
        cell, ox, oy = self.board_geometry()
        gap = max(0.5, min(1.5, cell * 0.06))
        radius = max(0, min(4, cell * 0.18))

        for r in range(self.rows):
            for c in range(self.cols):
                x1 = ox + c * cell + gap
                y1 = oy + r * cell + gap
                x2 = ox + (c + 1) * cell - gap
                y2 = oy + (r + 1) * cell - gap
                pos = (r, c)

                color = self.EMPTY
                if self.grid[r][c] == CellType.WALL:
                    color = self.WALL
                elif self.grid[r][c] == CellType.WEIGHT:
                    color = self.WEIGHT
                if pos in self.visited:
                    color = self.VISITED
                if pos in self.frontier:
                    color = self.FRONTIER
                if pos == self.current:
                    color = self.CURRENT
                if pos in self.path:
                    color = self.PATH
                if pos == self.start:
                    color = self.START
                elif pos == self.target:
                    color = self.TARGET

                self._rounded_rect(x1, y1, x2, y2, radius, fill=color, outline="")

                if self.grid[r][c] == CellType.WEIGHT and pos not in (self.start, self.target):
                    if cell >= 16:
                        self.canvas.create_text(
                            (x1 + x2) / 2,
                            (y1 + y2) / 2,
                            text=str(self.weights[r][c]),
                            fill="#f6e7c2",
                            font=("Helvetica", max(7, int(cell * 0.32)), "bold"),
                        )

        # Draw a continuous path line over the cells.
        if len(self.path) >= 2:
            pts = []
            for r, c in self.path:
                pts.extend((ox + (c + 0.5) * cell, oy + (r + 0.5) * cell))
            self.canvas.create_line(
                *pts,
                fill=self.PATH_EDGE,
                width=max(2, cell * 0.18),
                capstyle=tk.ROUND,
                joinstyle=tk.ROUND,
            )

        self._draw_endpoint_icon(self.start, "S", self.START, cell, ox, oy)
        self._draw_endpoint_icon(self.target, "T", self.TARGET, cell, ox, oy)

    def _draw_endpoint_icon(self, pos, label, color, cell, ox, oy):
        r, c = pos
        cx = ox + (c + 0.5) * cell
        cy = oy + (r + 0.5) * cell
        if cell >= 12:
            self.canvas.create_text(
                cx,
                cy,
                text=label,
                fill="#07111f",
                font=("Helvetica", max(8, int(cell * 0.40)), "bold"),
            )

    def _rounded_rect(self, x1, y1, x2, y2, radius, **kwargs):
        if radius <= 0:
            return self.canvas.create_rectangle(x1, y1, x2, y2, **kwargs)
        points = [
            x1 + radius, y1,
            x2 - radius, y1,
            x2, y1,
            x2, y1 + radius,
            x2, y2 - radius,
            x2, y2,
            x2 - radius, y2,
            x1 + radius, y2,
            x1, y2,
            x1, y2 - radius,
            x1, y1 + radius,
            x1, y1,
        ]
        return self.canvas.create_polygon(points, smooth=True, splinesteps=18, **kwargs)

    # ---------- Maze generation ----------
    def generate_maze(self):
        self.cancel_animation()
        self._invalidate_explanation()
        self._reset_grid_data()
        name = self.maze_name.get()
        self.status_text.set(f"Generating {name}…")
        self.root.update_idletasks()

        if name == "Random Walls":
            self._maze_random()
        elif name == "Recursive Division":
            self._maze_recursive_division()
        elif name == "Staircase":
            self._maze_staircase()
        elif name == "Weighted Terrain":
            self._maze_weighted_terrain()

        self._clear_endpoint_cells()
        self.status_text.set(f"{name} ready")
        self.redraw()

    def _clear_endpoint_cells(self):
        for r, c in (self.start, self.target):
            self.grid[r][c] = CellType.EMPTY
            self.weights[r][c] = 1

    def _maze_random(self):
        p = self.density_value.get() / 100.0
        for r in range(self.rows):
            for c in range(self.cols):
                if (r, c) not in (self.start, self.target) and random.random() < p:
                    self.grid[r][c] = CellType.WALL

        # Keep a small guaranteed breathing area around endpoints.
        for base in (self.start, self.target):
            br, bc = base
            for dr in range(-1, 2):
                for dc in range(-1, 2):
                    rr, cc = br + dr, bc + dc
                    if 0 <= rr < self.rows and 0 <= cc < self.cols:
                        self.grid[rr][cc] = CellType.EMPTY

    def _maze_staircase(self):
        r = max(2, self.rows // 6)
        c = 2
        direction = 1
        while c < self.cols - 2:
            for _ in range(max(2, self.rows // 5)):
                if 1 <= r < self.rows - 1 and 1 <= c < self.cols - 1:
                    self.grid[r][c] = CellType.WALL
                r += direction
                c += 1
                if c >= self.cols - 2:
                    break
            direction *= -1

        # Add a second broken staircase for denser boards.
        if self.rows >= 20:
            r = self.rows - 4
            for c in range(4, self.cols - 4, 2):
                self.grid[r][c] = CellType.WALL
                r -= 1
                if r <= self.rows // 2:
                    r = self.rows - 4

    def _maze_weighted_terrain(self):
        p = self.density_value.get() / 100.0
        for r in range(self.rows):
            for c in range(self.cols):
                if (r, c) in (self.start, self.target):
                    continue
                roll = random.random()
                if roll < p * 0.30:
                    self.grid[r][c] = CellType.WALL
                elif roll < p:
                    self.grid[r][c] = CellType.WEIGHT
                    self.weights[r][c] = random.randint(2, 9)

        # Light smoothing: grow a few small terrain patches.
        seeds = [(r, c) for r in range(self.rows) for c in range(self.cols) if self.grid[r][c] == CellType.WEIGHT]
        random.shuffle(seeds)
        for r, c in seeds[: max(2, len(seeds) // 8)]:
            for dr, dc in random.sample(self.DIRS, k=random.randint(1, 3)):
                rr, cc = r + dr, c + dc
                if 0 <= rr < self.rows and 0 <= cc < self.cols and (rr, cc) not in (self.start, self.target):
                    if self.grid[rr][cc] == CellType.EMPTY:
                        self.grid[rr][cc] = CellType.WEIGHT
                        self.weights[rr][cc] = self.weights[r][c]

    def _maze_recursive_division(self):
        # Border walls.
        for r in range(self.rows):
            self.grid[r][0] = CellType.WALL
            self.grid[r][self.cols - 1] = CellType.WALL
        for c in range(self.cols):
            self.grid[0][c] = CellType.WALL
            self.grid[self.rows - 1][c] = CellType.WALL

        def divide(r1, r2, c1, c2, orientation=None):
            height = r2 - r1 + 1
            width = c2 - c1 + 1
            if height < 4 or width < 4:
                return

            if orientation is None:
                if width > height:
                    orientation = "V"
                elif height > width:
                    orientation = "H"
                else:
                    orientation = random.choice(("H", "V"))

            if orientation == "H":
                candidates = [r for r in range(r1 + 1, r2) if r % 2 == 0]
                if not candidates:
                    return
                wall_r = random.choice(candidates)
                gaps = [c for c in range(c1, c2 + 1) if c % 2 == 1]
                gap_c = random.choice(gaps) if gaps else random.randint(c1, c2)
                for c in range(c1, c2 + 1):
                    if c != gap_c:
                        self.grid[wall_r][c] = CellType.WALL
                divide(r1, wall_r - 1, c1, c2, "V")
                divide(wall_r + 1, r2, c1, c2, "V")
            else:
                candidates = [c for c in range(c1 + 1, c2) if c % 2 == 0]
                if not candidates:
                    return
                wall_c = random.choice(candidates)
                gaps = [r for r in range(r1, r2 + 1) if r % 2 == 1]
                gap_r = random.choice(gaps) if gaps else random.randint(r1, r2)
                for r in range(r1, r2 + 1):
                    if r != gap_r:
                        self.grid[r][wall_c] = CellType.WALL
                divide(r1, r2, c1, wall_c - 1, "H")
                divide(r1, r2, wall_c + 1, c2, "H")

        divide(1, self.rows - 2, 1, self.cols - 2)

    # ---------- Search algorithms ----------
    def neighbors(self, cell):
        r, c = cell
        for dr, dc in self.DIRS:
            rr, cc = r + dr, c + dc
            if 0 <= rr < self.rows and 0 <= cc < self.cols and self.grid[rr][cc] != CellType.WALL:
                yield (rr, cc)

    def step_cost(self, cell):
        r, c = cell
        return self.weights[r][c] if self.grid[r][c] == CellType.WEIGHT else 1

    def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])

    def make_search_events(self):
        name = self.algorithm_name.get()
        if name == "Dijkstra":
            return self._dijkstra_events()
        if name == "A*":
            return self._astar_events()
        if name == "BFS":
            return self._bfs_events()
        return self._greedy_events()

    def _reconstruct(self, prev):
        if self.target not in prev and self.target != self.start:
            return []
        node = self.target
        path = [node]
        while node != self.start:
            node = prev.get(node)
            if node is None:
                return []
            path.append(node)
        path.reverse()
        return path

    def _dijkstra_events(self):
        pq = [(0, self.start)]
        dist = {self.start: 0}
        prev = {}
        settled = set()
        events = [SearchEvent("frontier", self.start, 0)]

        while pq:
            current_dist, node = heapq.heappop(pq)
            if node in settled:
                continue
            settled.add(node)
            events.append(SearchEvent("visit", node, current_dist))
            if node == self.target:
                break

            for nb in self.neighbors(node):
                nd = current_dist + self.step_cost(nb)
                if nd < dist.get(nb, float("inf")):
                    dist[nb] = nd
                    prev[nb] = node
                    heapq.heappush(pq, (nd, nb))
                    events.append(SearchEvent("frontier", nb, nd))

        path = self._reconstruct(prev)
        if path:
            events.append(SearchEvent("path_start", value=dist.get(self.target, 0)))
            for cell in path:
                events.append(SearchEvent("path", cell))
        events.append(SearchEvent("done", value=dist.get(self.target, float("inf"))))
        return events

    def _astar_events(self):
        pq = [(self.heuristic(self.start, self.target), 0, self.start)]
        g = {self.start: 0}
        prev = {}
        closed = set()
        events = [SearchEvent("frontier", self.start, 0)]

        while pq:
            _, current_g, node = heapq.heappop(pq)
            if node in closed:
                continue
            closed.add(node)
            events.append(SearchEvent("visit", node, current_g))
            if node == self.target:
                break

            for nb in self.neighbors(node):
                ng = current_g + self.step_cost(nb)
                if ng < g.get(nb, float("inf")):
                    g[nb] = ng
                    prev[nb] = node
                    f = ng + self.heuristic(nb, self.target)
                    heapq.heappush(pq, (f, ng, nb))
                    events.append(SearchEvent("frontier", nb, ng))

        path = self._reconstruct(prev)
        if path:
            events.append(SearchEvent("path_start", value=g.get(self.target, 0)))
            for cell in path:
                events.append(SearchEvent("path", cell))
        events.append(SearchEvent("done", value=g.get(self.target, float("inf"))))
        return events

    def _bfs_events(self):
        q = deque([self.start])
        prev = {}
        seen = {self.start}
        depth = {self.start: 0}
        events = [SearchEvent("frontier", self.start, 0)]

        while q:
            node = q.popleft()
            events.append(SearchEvent("visit", node, depth[node]))
            if node == self.target:
                break
            for nb in self.neighbors(node):
                if nb not in seen:
                    seen.add(nb)
                    prev[nb] = node
                    depth[nb] = depth[node] + 1
                    q.append(nb)
                    events.append(SearchEvent("frontier", nb, depth[nb]))

        path = self._reconstruct(prev)
        cost = sum(self.step_cost(cell) for cell in path[1:]) if path else float("inf")
        if path:
            events.append(SearchEvent("path_start", value=cost))
            for cell in path:
                events.append(SearchEvent("path", cell))
        events.append(SearchEvent("done", value=cost))
        return events

    def _greedy_events(self):
        pq = [(self.heuristic(self.start, self.target), self.start)]
        prev = {}
        seen = {self.start}
        events = [SearchEvent("frontier", self.start, 0)]

        while pq:
            _, node = heapq.heappop(pq)
            events.append(SearchEvent("visit", node))
            if node == self.target:
                break
            for nb in self.neighbors(node):
                if nb not in seen:
                    seen.add(nb)
                    prev[nb] = node
                    heapq.heappush(pq, (self.heuristic(nb, self.target), nb))
                    events.append(SearchEvent("frontier", nb))

        path = self._reconstruct(prev)
        cost = sum(self.step_cost(cell) for cell in path[1:]) if path else float("inf")
        if path:
            events.append(SearchEvent("path_start", value=cost))
            for cell in path:
                events.append(SearchEvent("path", cell))
        events.append(SearchEvent("done", value=cost))
        return events

    # ---------- Animation ----------
    def run_search(self):
        self.cancel_animation()
        self.clear_search_state()
        self._invalidate_explanation()
        compute_start = time.perf_counter()
        self.events = self.make_search_events()
        self.algorithm_runtime_ms = (time.perf_counter() - compute_start) * 1000
        self.event_index = 0
        self.running = True
        self.paused = False
        self.pause_btn.set_text("⏸ Pause")
        self.search_started_at = time.perf_counter()
        self.status_text.set(f"Running {self.algorithm_name.get()}…")
        self._animate_next()

    def toggle_pause(self):
        if not self.running:
            return
        self.paused = not self.paused
        self.pause_btn.set_text("▶ Resume" if self.paused else "⏸ Pause")
        self.status_text.set("Paused" if self.paused else f"Running {self.algorithm_name.get()}…")
        if not self.paused:
            self._animate_next()

    def step_once(self):
        # Manual stepping takes control immediately from any scheduled animation
        # frame so rapid clicks always advance exactly one event per click.
        if self.animation_after_id is not None:
            try:
                self.root.after_cancel(self.animation_after_id)
            except tk.TclError:
                pass
            self.animation_after_id = None

        if not self.events:
            self.clear_search_state()
            self._invalidate_explanation()
            compute_start = time.perf_counter()
            self.events = self.make_search_events()
            self.algorithm_runtime_ms = (time.perf_counter() - compute_start) * 1000
            self.event_index = 0
            self.running = True
            self.paused = True
            self.search_started_at = time.perf_counter()
            self.pause_btn.set_text("▶ Resume")
        else:
            self.running = True
            self.paused = True
            self.pause_btn.set_text("▶ Resume")

        if self.event_index < len(self.events):
            self._apply_event(self.events[self.event_index])
            self.event_index += 1
            if self.running:
                self.status_text.set(f"Step {self.event_index}/{len(self.events)}")
            self.redraw()

    def _reset_visual_state_for_replay(self):
        """Reset only visual/search progress while keeping the recorded events."""
        self.frontier.clear()
        self.visited.clear()
        self.current = None
        self.path = []
        self.distance_labels = {}
        self.visited_count.set("0")
        self.path_length.set("0")
        self.path_cost.set("0")
        self.search_complete = False
        self.last_search_found_path = False

    def _replay_to_event_index(self, target_index):
        """Rebuild the visible search state from event 0 up to target_index."""
        target_index = max(0, min(target_index, len(self.events)))
        recorded_runtime = self.runtime_ms.get()
        self._reset_visual_state_for_replay()
        self.running = True
        self.paused = True

        for i in range(target_index):
            self._apply_event(self.events[i])

        # A replay used by backward stepping never intentionally includes the
        # final done event, but restore manual-step mode defensively regardless.
        self.event_index = target_index
        self.running = bool(self.events)
        self.paused = bool(self.events)
        self.pause_btn.set_text("▶ Resume")
        self.runtime_ms.set(recorded_runtime)
        if self.events:
            self.status_text.set(f"Step {self.event_index}/{len(self.events)}")
        else:
            self.status_text.set("Ready")
        self.redraw()

    def step_back_once(self):
        """Move the recorded visualization backward by exactly one event."""
        if self.animation_after_id is not None:
            try:
                self.root.after_cancel(self.animation_after_id)
            except tk.TclError:
                pass
            self.animation_after_id = None

        if not self.events or self.event_index <= 0:
            return

        self._replay_to_event_index(self.event_index - 1)

    def _animate_next(self):
        if not self.running or self.paused:
            return
        if self.event_index >= len(self.events):
            self.running = False
            return

        speed = int(self.speed_value.get())
        if speed <= 100:
            batch = 1
            delay = max(8, int(150 - speed * 1.40))
        else:
            # Above 100 we intentionally process multiple events per frame. This
            # makes the upper end substantially faster than Tk's timer resolution
            # would allow with delay reduction alone.
            batch = min(12, 1 + (speed - 100) // 18)
            delay = max(1, int(10 - (speed - 100) * 0.045))

        last_kind = None
        for _ in range(batch):
            if not self.running or self.paused or self.event_index >= len(self.events):
                break
            event = self.events[self.event_index]
            self.event_index += 1
            last_kind = event.kind
            self._apply_event(event)

        self.redraw()

        if self.running and not self.paused and self.event_index < len(self.events):
            if last_kind == "path" and speed <= 100:
                delay = max(14, delay * 2)
            self.animation_after_id = self.root.after(delay, self._animate_next)

    def _apply_event(self, event):
        if event.kind == "frontier" and event.cell:
            if event.cell not in self.visited:
                self.frontier.add(event.cell)
            if event.value is not None:
                self.distance_labels[event.cell] = event.value

        elif event.kind == "visit" and event.cell:
            self.current = event.cell
            self.frontier.discard(event.cell)
            self.visited.add(event.cell)
            self.visited_count.set(str(len(self.visited)))

        elif event.kind == "path_start":
            self.current = None
            if event.value is not None and event.value != float("inf"):
                self.path_cost.set(str(int(event.value)))
            self.status_text.set("Tracing shortest path…")

        elif event.kind == "path" and event.cell:
            self.path.append(event.cell)
            self.path_length.set(str(max(0, len(self.path) - 1)))

        elif event.kind == "done":
            self.current = None
            self.running = False
            self.runtime_ms.set(f"{self.algorithm_runtime_ms:.2f} ms")
            self.search_complete = True
            self.last_search_found_path = event.value != float("inf")
            if event.value == float("inf"):
                self.status_text.set("No path found")
            else:
                self.status_text.set("Path found")

    def show_guide(self):
        popup = tk.Toplevel(self.root)
        popup.title("Pathfinding Lab Guide")
        popup.configure(bg=self.PANEL)
        popup.geometry("690x620")
        popup.minsize(560, 480)
        popup.transient(self.root)

        shell = tk.Frame(
            popup,
            bg=self.PANEL,
            highlightthickness=1,
            highlightbackground=self.BORDER,
        )
        shell.pack(fill="both", expand=True, padx=1, pady=1)

        title_row = tk.Frame(shell, bg=self.PANEL)
        title_row.pack(fill="x", padx=20, pady=(18, 8))
        tk.Label(
            title_row,
            text="PATHFINDING LAB GUIDE",
            bg=self.PANEL,
            fg=self.TEXT,
            font=("Helvetica", 15, "bold"),
        ).pack(side="left")

        text_wrap = tk.Frame(shell, bg=self.PANEL)
        text_wrap.pack(fill="both", expand=True, padx=18, pady=(0, 12))

        scrollbar = tk.Scrollbar(text_wrap, orient="vertical")
        scrollbar.pack(side="right", fill="y")

        guide = tk.Text(
            text_wrap,
            wrap="word",
            bg=self.PANEL_2,
            fg=self.TEXT,
            insertbackground=self.TEXT,
            selectbackground=self.ACCENT,
            selectforeground="#07111f",
            relief="flat",
            bd=0,
            padx=18,
            pady=16,
            font=("Helvetica", 10),
            yscrollcommand=scrollbar.set,
        )
        guide.pack(side="left", fill="both", expand=True)
        scrollbar.config(command=guide.yview)

        guide.tag_configure("section", foreground=self.ACCENT, font=("Helvetica", 11, "bold"), spacing1=10, spacing3=4)
        guide.tag_configure("body", foreground=self.TEXT, font=("Helvetica", 10), spacing3=8)
        guide.tag_configure("muted", foreground=self.MUTED, font=("Helvetica", 9), spacing3=8)

        sections = [
            (
                "Getting started",
                "Choose an algorithm, edit the board with the tools, optionally generate a maze, then press Run. The green S is the start and the pink T is the target. The colored search tiles show the algorithm exploring the board before the final path is traced.",
            ),
            (
                "Algorithms",
                "Dijkstra expands the reachable cell with the lowest accumulated cost and guarantees the cheapest path when movement costs are non-negative. A* adds a distance estimate toward the target, usually exploring fewer cells while still finding an optimal path with this grid heuristic. BFS explores level by level and guarantees the fewest moves on an unweighted board, but it does not optimize weighted cost. Greedy Best-First prioritizes whichever cell appears closest to the target; it is often fast and direct, but its path is not guaranteed to be optimal.",
            ),
            (
                "Tools",
                "Wall paints impassable cells. Eraser removes walls or weights. Weight paints traversable cells that cost more to enter. Move Start and Move Target are the only modes that reposition S and T; selecting any other tool locks the endpoints in place. You can also right-click a non-endpoint cell to erase it quickly.",
            ),
            (
                "Weights and weight cost",
                "A normal cell costs 1 to enter. Weighted cells use the selected Weight cost from 2 through 9. Dijkstra and A* account for those costs, so a longer-looking route can be cheaper than a short route through expensive cells. BFS and Greedy Best-First do not use weighted cost in the same optimal way, which makes weighted boards useful for comparing algorithms.",
            ),
            (
                "Maze generation",
                "Choose a maze style, then press Generate Maze. Random Walls scatters obstacles according to Density. Recursive Division builds room-like partitions and passages. Staircase creates a structured obstacle pattern. Weighted Terrain creates cost variation rather than only hard barriers. Generated layouts are intentionally not guaranteed to contain a solution, so an occasional “No path found” result is expected; generate again, reduce density, or edit the board if you want another layout.",
            ),
            (
                "Density",
                "Density controls how heavily the generated maze is populated. Lower values leave more open space and usually make paths easier to find. Higher values create tighter, more obstructed boards and increase the chance that the target becomes unreachable. Its exact visual effect depends on the selected maze generator.",
            ),
            (
                "Board size",
                "Board size changes the number of rows and columns. Larger boards give the algorithms more search space and make exploration patterns easier to compare, while smaller boards are useful for slow step-by-step inspection. Changing the size creates a fresh empty board and repositions the endpoints.",
            ),
            (
                "Animation speed",
                "Animation speed controls how quickly search events are displayed. At low values, nodes advance slowly enough to inspect individual choices. At high values, the lab batches multiple events per frame so large searches finish much faster without changing the algorithm's result.",
            ),
            (
                "Run, step, pause, and reset",
                "Run starts the selected algorithm from the beginning. ◀ Step moves the visualization backward by exactly one recorded search event. Pause freezes an active run and Resume continues it. Step ▶ moves forward by exactly one event and automatically puts the run in a paused state, which is useful for inspection. Reset clears the entire board and search and restores every configurable parameter to its default value.",
            ),
            (
                "Status and metrics",
                "The status box reports the current state, such as running, paused, path found, no path found, or reset to defaults. Visited counts processed cells, Path counts moves in the final route, Cost reports total traversal cost, and Runtime reports the time used to compute the search event sequence.",
            ),
        ]

        for heading, body in sections:
            guide.insert("end", heading + "\n", "section")
            guide.insert("end", body + "\n", "body")

        guide.insert(
            "end",
            "Tip: the backward and forward step controls are most useful while paused, because you can inspect the exact order in which frontier, visit, and path events occurred.\n",
            "muted",
        )
        guide.config(state="disabled")

        footer = tk.Frame(shell, bg=self.PANEL)
        footer.pack(fill="x", padx=18, pady=(0, 16))
        self._button(footer, "Close", popup.destroy, accent=True, width=8).pack(side="right")

        popup.update_idletasks()
        x = self.root.winfo_rootx() + (self.root.winfo_width() - popup.winfo_width()) // 2
        y = self.root.winfo_rooty() + (self.root.winfo_height() - popup.winfo_height()) // 2
        popup.geometry(f"+{max(0, x)}+{max(0, y)}")
        popup.grab_set()
        popup.focus_force()

    def cancel_animation(self, clear_search=False):
        if self.animation_after_id is not None:
            try:
                self.root.after_cancel(self.animation_after_id)
            except tk.TclError:
                pass
        self.animation_after_id = None
        self.running = False
        self.paused = False
        self.pause_btn.set_text("⏸ Pause") if hasattr(self, "pause_btn") else None
        if clear_search:
            self.clear_search_state()
            self.status_text.set("Ready")
            self.redraw()


if __name__ == "__main__":
    root = tk.Tk()
    app = PathfindingVisualizer(root)
    root.mainloop()
