# GraphCP - Graph Editor for Competitive Programming

GraphCP is the ultimate, zero-dependency, single-file HTML5 graph editor and algorithm visualizer designed specifically for Competitive Programming. It is built to help you quickly construct graphs, visualize complex algorithms, and seamlessly translate them into C++, Python, or Edge List representations.

## 🚀 Key Features

*   **Zero Dependencies**: The entire editor runs from a single `index.html` file using Vanilla JS and HTML5 Canvas.
*   **Rich Algorithm Library**: 13 built-in algorithms categorized by Traversal, Shortest Path, Spanning Tree, Connectivity, and more.
*   **Step-by-Step Animation**: See precisely how algorithms like Dijkstra or Tarjan's traverse your graph with full playback controls and adjustable speeds.
*   **Advanced Export Options**: Export your graph directly to a **C++ Adjacency List**, Python Dictionary, Adjacency Matrix, Edge List, Graphviz DOT, or as a PNG image.
*   **Competitive Programming Focused**:
    *   Easily toggle between **0-indexed** and **1-indexed** node labels.
    *   Support for Directed / Undirected edges.
    *   Support for Weighted / Unweighted edges.
    *   Support for Multi-edges and Self-loops.
    *   Directly parse Edge Lists or Adjacency Matrices into visual graphs.
*   **Graph Templates**: Instantly generate complete, bipartite, cycle, star, tree, grid, or randomized graphs.

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
| **Context Menu** | `Right-Click` | Right-click a node to set it as a **Source**, **Destination**, or rename its label. Right-click an edge to modify its weight. |
| **Undo / Redo** | <kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd> | Navigate your graph edit history. |
| **Fit View** | <kbd>F</kbd> | Automatically zoom and pan to fit all nodes on the screen. |
| **Shortcuts List**| <kbd>?</kbd> | Show the full list of keyboard shortcuts inside the app. |

## 🏃 Getting Started

Because GraphCP is completely client-side, getting started takes less than a second:

1.  Clone this repository or download the `index.html` file.
2.  Open `index.html` in any modern web browser (Google Chrome, Firefox, Safari, Edge).
3.  Start building graphs! 

## 🛠️ Typical Workflow for CP

1.  **Read the Problem**: Note if the graph is 0/1 indexed, directed/undirected, and weighted/unweighted.
2.  **Configure Settings**: Go to the **Settings** tab (⚙️) and configure the graph properties to match the problem description.
3.  **Paste Input**: Go to the **I/O** tab (⇄), paste the edge list directly from the problem statement, and click **Parse**.
4.  **Visualize**: Right-click the starting node and choose **Set as Source**. Go to the **Algorithms** tab (▶), pick your algorithm, and click **Run Algorithm**.
5.  **Export Code**: Go back to the **I/O** tab and click **Copy** next to **C++ Adj List** to paste the generated boilerplate directly into your IDE.
