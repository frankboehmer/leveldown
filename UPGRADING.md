# Upgrade Guide

This document describes breaking changes and how to upgrade. For a complete list of changes including minor and patch releases, please refer to the [changelog](CHANGELOG.md).

## v4

Dropped support for node 4. No other breaking changes.

## v3.0.1

If you're using node v10 you'll need at least `leveldown@2.0.1` to successfully compile. In addition, if you want prebuilt binaries you'll need at least `leveldown@3.0.1`.

## v3

#### `.batch(array)` enforces objects

This major release contains an upgrade to `abstract-leveldown` with a [breaking change](https://github.com/Level/abstract-leveldown/commit/a2621ad70571f6ade9d2be42632ece042e068805) for the array version of `.batch()`. This change ensures all elements in the batch array are objects.

If you previously passed arrays to `.batch()` that contained `undefined` or `null`, they would be silently ignored. Now this will produce an error.
