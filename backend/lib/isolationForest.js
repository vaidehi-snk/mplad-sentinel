// A real Isolation Forest, implemented from scratch. This is the same
// algorithm scikit-learn's IsolationForest uses (Liu, Ting & Zhou, 2008):
// build many random trees that isolate points by random splits; points
// that get isolated in fewer splits (shorter average path length across
// all trees) are more anomalous, because they're "easier to separate"
// from the rest of the data.
//
// Why implement it here instead of calling scikit-learn: this project's
// backend is Node/Express, and adding a Python service just for one model
// means two languages, two deploy targets, and a network hop for every
// score. A from-scratch JS version keeps the whole system deployable as
// one service, and -- just as important for a hackathon defense -- means
// your team can actually explain every line of it if a judge asks.

class IsolationTree {
  constructor(maxDepth) {
    this.maxDepth = maxDepth;
    this.splitFeature = null;
    this.splitValue = null;
    this.left = null;
    this.right = null;
    this.isLeaf = false;
    this.size = 0;
  }

  fit(data, depth = 0) {
    this.size = data.length;
    if (depth >= this.maxDepth || data.length <= 1) {
      this.isLeaf = true;
      return;
    }

    const numFeatures = data[0].length;
    this.splitFeature = Math.floor(Math.random() * numFeatures);

    const values = data.map((row) => row[this.splitFeature]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      this.isLeaf = true;
      return;
    }

    this.splitValue = min + Math.random() * (max - min);

    const leftData = data.filter((row) => row[this.splitFeature] < this.splitValue);
    const rightData = data.filter((row) => row[this.splitFeature] >= this.splitValue);

    if (leftData.length === 0 || rightData.length === 0) {
      this.isLeaf = true;
      return;
    }

    this.left = new IsolationTree(this.maxDepth);
    this.left.fit(leftData, depth + 1);
    this.right = new IsolationTree(this.maxDepth);
    this.right.fit(rightData, depth + 1);
  }

  // Path length to isolate a single point, with a correction for leaves
  // that still contain multiple points (average path length of an
  // unsuccessful BST search over the remaining points -- the standard
  // Isolation Forest correction, c(n)).
  pathLength(point, depth = 0) {
    if (this.isLeaf) {
      return depth + averagePathLength(this.size);
    }
    if (point[this.splitFeature] < this.splitValue) {
      return this.left.pathLength(point, depth + 1);
    }
    return this.right.pathLength(point, depth + 1);
  }
}

// c(n): average path length of an unsuccessful search in a Binary Search
// Tree of n points. Used to normalize path lengths across trees built on
// different sample sizes.
function averagePathLength(n) {
  if (n <= 1) return 0;
  const EULER_GAMMA = 0.5772156649;
  return 2 * (Math.log(n - 1) + EULER_GAMMA) - (2 * (n - 1)) / n;
}

export class IsolationForest {
  constructor({ numTrees = 100, sampleSize = 256 } = {}) {
    this.numTrees = numTrees;
    this.sampleSize = sampleSize;
    this.trees = [];
    this.featureMeans = [];
    this.featureStds = [];
  }

  // Standardizes features (mean 0, std 1) so that features on very
  // different scales (e.g. sanctioned amount in lakhs vs. a 0-5 batch
  // count) don't let one feature dominate the random splits.
  normalize(data) {
    const numFeatures = data[0].length;
    if (this.featureMeans.length === 0) {
      for (let f = 0; f < numFeatures; f++) {
        const col = data.map((row) => row[f]);
        const mean = col.reduce((a, b) => a + b, 0) / col.length;
        const variance = col.reduce((a, b) => a + (b - mean) ** 2, 0) / col.length;
        this.featureMeans.push(mean);
        this.featureStds.push(Math.sqrt(variance) || 1);
      }
    }
    return data.map((row) => row.map((v, f) => (v - this.featureMeans[f]) / this.featureStds[f]));
  }

  fit(data) {
    const normalized = this.normalize(data);
    const sampleN = Math.min(this.sampleSize, normalized.length);
    const maxDepth = Math.ceil(Math.log2(sampleN || 2));

    this.trees = [];
    for (let i = 0; i < this.numTrees; i++) {
      const sample = [];
      for (let j = 0; j < sampleN; j++) {
        sample.push(normalized[Math.floor(Math.random() * normalized.length)]);
      }
      const tree = new IsolationTree(maxDepth);
      tree.fit(sample);
      this.trees.push(tree);
    }
    this._trainSampleSize = sampleN;
  }

  // Anomaly score in [0, 1]. Scores near 1 = anomalous (isolated in very
  // few splits, on average, across all trees). Scores near 0.5 = normal.
  // This is the standard Isolation Forest scoring formula.
  score(point) {
    const normalized = point.map((v, f) => (v - this.featureMeans[f]) / this.featureStds[f]);
    const avgPathLength =
      this.trees.reduce((sum, tree) => sum + tree.pathLength(normalized), 0) / this.trees.length;
    const c = averagePathLength(this._trainSampleSize);
    return Math.pow(2, -avgPathLength / c);
  }

  scoreAll(data) {
    return data.map((point) => this.score(point));
  }
}
