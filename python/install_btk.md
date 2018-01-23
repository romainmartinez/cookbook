# Install btk in conda env

1. Download source code: [link](https://github.com/Biomechanical-ToolKit/BTKCore)
2. Extract archive in a './btk' folder
3. In `Wrapping/Python/CMakeLists.txt`, replace line 23:

`SET(CMAKE_SWIG_FLAGS "-py3")`

4. Start cmake-gui
5. Configure with `BTK_WRAP_PYTHON` activated
6. Active `grouped` and `advanced` options in cmake-gui
7. Configure with the following options:
    - `PYTHON_EXECUTABLE`: `/home/romain/miniconda3/bin/python3.6m`
    - `PYTHON_INCLUDE_DIR`: `/home/romain/miniconda3/include/python3.6m`
    - `PYTHON_LIBRARY`: `/home/romain/miniconda3/lib/libpython3.6m.so`
    - `SWIG_DIR`: `/usr/share/swig3.0`
    - `SWIG_EXECUTABLE`: `/usr/bin/swig3.0`
    - `SWIG_VERSION`: `3.0.8`
8. Configure and add the following entries:
    - `NUMPY_INCLUDE_DIR`: `/home/romain/miniconda3/lib/python3.6/site-packages/numpy/core/include`
    - `NUMPY_VERSION`: `1.13.3`
9. Go in your build directory and copy all files in the `bin` direction into:
    - `/home/romain/miniconda3/lib/python3.6/site-packages/btk`
10. In this directory, rename `btk.py` as `__init__.py`
