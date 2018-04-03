#!/bin/bash
mkdir build
cd build

# figure out include / library paths
pyinc=$($PYTHON -c "from distutils import sysconfig; print(sysconfig.get_python_inc())")
if [[ $(uname) == "Darwin" ]]; then
    pylib=$(otool -L $PYTHON | grep 'libpython.*\.dylib' | tr '\t' ' ' | cut -d' ' -f2 | sed "s|@rpath|$PREFIX/lib|")
else
    pylib=$(ldd $PYTHON | grep $PREFIX | grep 'libpython.*\.so' | cut -d' ' -f3)
fi

# figure out numpy include dir
npyinc=$($PYTHON -c "import numpy as np; print(np.get_include())")

cmake ../ \
      -DCMAKE_INSTALL_PREFIX=$PREFIX \
      -DBUILD_SHARED_LIBS=ON \
      -DBTK_WRAP_PYTHON=ON \
      -DPYTHON_EXECUTABLE=$PYTHON \
      -DPYTHON_INCLUDE_DIR=$pyinc \
      -DPYTHON_LIBRARY=$pylib \
      -DNUMPY_INCLUDE_DIR=$npyinc \
      -DNUMPY_VERSION=$NPY_VER

make -j $CPU_COUNT
make install
