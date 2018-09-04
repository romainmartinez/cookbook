import matplotlib.pyplot as plt
import seaborn as sns


def set_style(style='mrtnz'):
    if style == 'mrtnz' or style == 'mrtnz_tex':
        style = {
            'axes.labelsize': 20,
            'axes.labelsize': 20,
            'xtick.labelsize': 16,
            'ytick.labelsize': 16,
            'legend.fontsize': 16
        }
        if style == 'mtrnz_tex':
            style.update({'text.usetex': True})
        plt.rcParams.update(style)
    else:
        raise NotImplementedError(f'{style} is not available')


def show(save=False):
    sns.despine(offset=10, trim=True)
    plt.tight_layout()
    if save:
        plt.savefig(save, transparent=True)
    plt.show()
