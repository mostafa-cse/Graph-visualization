# GraphCP - Graph Editor for Competitive Programming

GraphCP is the ultimate, zero-dependency HTML5 graph editor and algorithm visualizer designed specifically for Competitive Programming. It is built to help you quickly construct graphs, visualize complex algorithms, and seamlessly translate them into C++, Python, or Edge List representations.

## 🚀 Key Features

*   **Floating & Resizable Glass Sidebar**: Moveable floating control panel that snaps to any screen corner (Top-Right, Top-Left, Bottom-Left, Bottom-Right) with smooth spring easing.
*   **Horizontal & Vertical Resizing**: Drag the left border (`resize-w`), right border (`resize-e`), or corners to resize sideways, or click the green header button to toggle between compact (290px) and wide (480px) modes.
*   **3D Water-Drop Bubble Mode**: Minimize the panel into an ultra-realistic 3D clear glass water sphere ("panir drop") featuring glass caustics, backdrop-filter optics, and a 3D breathing animation.
*   **Zero Dependencies**: Built with pure Vanilla HTML5, CSS3, and Javascript — three static files, no build step.
*   **Rich Algorithm Library**: 13 built-in algorithms categorized by Traversal, Shortest Path, Spanning Tree, Connectivity, and more.
*   **Step-by-Step Animation**: See precisely how algorithms like Dijkstra or Tarjan's traverse your graph. A floating transport bar sits over the canvas with play/pause, single-stepping, a **seek scrubber**, and a speed control — so you can scrub a 200-step trace without leaving the canvas.
*   **Trace Log That Follows You**: Every step is logged, the current step is highlighted, and scrubbing backwards rewinds the log instead of duplicating it.
*   **Contextual Legend**: The colour key shows only what the *running* algorithm actually uses — tree vs. back edges for DFS, rejected-cycle edges for Kruskal, component colours for SCC.
*   **Advanced Export Options**: Export your graph to a **C++ Adjacency List**, Python Dictionary, Adjacency Matrix, Edge List, Graphviz DOT, JSON (with node positions), or a **PNG of the whole graph at 2x** — not just the visible viewport.
*   **Your Work Sticks Around**: The graph, your settings, and the camera are saved to `localStorage` and restored on the next visit.
*   **Competitive Programming Focused**:
    *   Easily toggle between **0-indexed** and **1-indexed** node labels.
    *   Support for Directed / Undirected edges.
    *   Support for Weighted / Unweighted edges.
    *   Support for Multi-edges and Self-loops — parallel edges fan out into separate arcs so they stay individually visible and clickable.
    *   Directly parse Edge Lists or Adjacency Matrices into visual graphs.
*   **Graph Templates**: Instantly generate complete, bipartite, cycle, star, tree, grid, or randomized graphs.
*   **Built for Long Sessions**: Retina-sharp canvas rendering and an idle canvas that stops redrawing so it doesn't cook your battery.

## 🧠 Supported Algorithms

1.  **Traversal**: BFS, DFS
2.  **Single-Source Shortest Path (SSSP)**: Dijkstra, Bellman-Ford
3.  **All-Pairs Shortest Path (APSP)**: Floyd-Warshall
4.  **Minimum Spanning Tree (MST)**: Kruskal, Prim
5.  **Connectivity & Advanced**: Tarjan's Find Bridges, Tarjan's Articulation Points, Kosaraju's Strongly Connected Components (SCC), Bipartite Check (2-Coloring)
6.  **Other**: Topological Sort, Eulerian Circuit Check

## 🖱️ How to Use (Controls & Shortcuts)

You can switch between tools using the top toolbar, or by utilizing the convenient keyboard shortcuts:

| Action | Key | Description |
| :--- | :--- | :--- |
| **Select / Move** | <kbd>V</kbd> | Move nodes or select elements. |
| **Add Node** | <kbd>N</kbd> | Click anywhere on the canvas to add a new node (or double-click the canvas). |
| **Add Edge** | <kbd>E</kbd> | Click the source node, then click the target node. |
| **Delete Mode** | <kbd>Del</kbd> or <kbd>Backspace</kbd> | Click on a node or edge to delete it. |
| **Toggle Water Drop** | <kbd>B</kbd> | Minimize panel to 3D glass water drop bubble / restore panel. |
| **Cycle Panel Corner** | <kbd>C</kbd> | Dock panel to TR → TL → BL → BR corners. |
| **Context Menu** | `Right-Click` | Right-click a node to set it as a **Source**, **Destination**, or rename its label. Right-click an edge to modify its weight. |
| **Undo / Redo** | <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> | Navigate your graph edit history. |
| **Fit View** | <kbd>F</kbd> | Automatically zoom and pan to fit all nodes on the screen. |
| **Zoom / Pan** | `Scroll` / `Drag` | Scroll to zoom at the pointer. Drag empty canvas (or middle-drag) to pan; <kbd>Shift</kbd>+scroll pans horizontally. |
| **Shortcuts List**| <kbd>?</kbd> | Show the full list of keyboard shortcuts inside the app. |

While an algorithm is loaded, the transport bar takes over the playback keys:

| Action | Key |
| :--- | :--- |
| **Play / Pause** | <kbd>Space</kbd> |
| **Step backward / forward** | <kbd>&larr;</kbd> / <kbd>&rarr;</kbd> |
| **Jump to first / last step** | <kbd>Home</kbd> / <kbd>End</kbd> |
| **Reset & close** | <kbd>Esc</kbd> |

## 🏃 Getting Started

Because GraphCP is completely client-side, getting started takes less than a second:

1.  Clone this repository (you need `index.html`, `main.css`, and `app.js` sitting next to each other).
2.  Open `index.html` in any modern web browser (Google Chrome, Firefox, Safari, Edge).
3.  Start building graphs!

Your graph and settings are saved locally in the browser, so closing the tab and coming back later picks up where you left off. Use **Clear Graph** in the toolbar to start fresh.

## 🛠️ Typical Workflow for CP

1.  **Read the Problem**: Note if the graph is 0/1 indexed, directed/undirected, and weighted/unweighted.
2.  **Configure Settings**: Go to the **Settings** tab (⚙️) and configure the graph properties to match the problem description.
3.  **Paste Input**: Go to the **I/O** tab (⇄), paste the edge list directly from the problem statement, and click **Parse**.
4.  **Visualize**: Right-click the starting node and choose **Set as Source**. Go to the **Algorithms** tab (▶), pick your algorithm, and click **Run Algorithm**. Use the transport bar at the bottom of the canvas to pause and scrub to the exact step you want to reason about — the trace log stays in sync with it.
5.  **Export Code**: Go back to the **I/O** tab and click **Copy** next to **C++ Adj List** to paste the generated boilerplate directly into your IDE.
