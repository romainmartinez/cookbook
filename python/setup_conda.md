# Setup a fresh Conda

## 1. Clean previous version
- Uninstalling  Miniconda:
```bash
rm -rf ~/miniconda* ~/.condarc ~/.conda ~/.continuum
```
- Uninstalling Pycharm: from the Ubuntu Software

## 2. Install Miniconda

- Install Miniconda: [installer](https://conda.io/miniconda.html)

```bash
bash Miniconda3-latest-Linux-x86_64.sh
```



- (*optional*) install jupyterlab

```bas
sudo apt install npm
conda install -c conda-forge jupyterlab
jupyter labextension install jupyterlab-toc
jupyter labextension install @jupyterlab/plotly-extension

cd ENV
conda env create -f env.yml
source activate ENV
python -m ipykernel install --user --name ENV
```
